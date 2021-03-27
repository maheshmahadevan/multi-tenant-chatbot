// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const lunr = require('lunr');

const db = JSON.parse(`{
    "configs": [
        {
            "customer_id": "abc_car",
            "welcome_messages": {
                "morning": "Welcome to ABC Car Dealership, please say in words where you want to redirect your call , for example , say Sales or Connect me to Service",
                "afternoon": "Welcome to ABC Car Dealership, please say in words where you want to redirect your call , for example , say Sales or Connect me to Service",
                "evening": "Welcome to ABC Car Dealership, Sorry we are closed at this hour , please call back during working hours"
            },
            "action": {
                "morning": "SET_CONTEXT",
                "afternoon": "SET_CONTEXT",
                "evening": "RESET_CONTEXT"
            },
            "menus": [
                "sales",
                "service",
                "finance"
            ],
            "menu_configs": {
                "sales": {
                    "welcome_messages": {
                        "morning": "BMW , Audi or Mercedes",
                        "afternoon": "BMW , Audi or Mercedes",
                        "evening": "Sorry we are not available this time"
                    },
                    "menus": [
                        "bmw",
                        "audi",
                        "mercedes"
                    ],
                    "action": {
                        "morning": "SET_CONTEXT",
                        "afternoon": "SET_CONTEXT",
                        "evening": "RESET_CONTEXT"
                    },
                    "menu_configs": {
                        "bmw": {
                            "action": {
                                "all": "TRANSFER"
                            }
                        },
                        "audi": {
                            "action": {
                                "all": "TRANSFER"
                            }
                        },
                        "mercedes": {
                            "action": {
                                "all": "TRANSFER"
                            }
                        }
                    }
                },
                "service": {
                    "action": {
                        "all": "TRANSFER"
                    }
                },
                "finance": {
                    "action": {
                        "all": "TRANSFER"
                    }
                }
            }
        },
        {
            "customer_id": "abc_health",
            "welcome_messages": {
                "morning": "Welcome to ABC Health Care , please say in words where you want to redirect your call , for example , say Radiology or Connect me to Cardio",
                "afternoon": "Welcome to ABC Health Care , please say in words where you want to redirect your call , for example , say Radiology or Connect me to Cardio",
                "evening": "Welcome to ABC Health Care , please say in words where you want to redirect your call , for example , say Radiology or Connect me to Cardio"
            },
            "action": {
                "morning": "SET_CONTEXT",
                "afternoon": "SET_CONTEXT",
                "evening": "SET_CONTEXT"
            },
            "menus": [
                "radiology",
                "oncology",
                "trauma",
                "cardio"
            ],
            "menu_configs": {
                "radiology": {
                    "action": {
                        "all": "TRANSFER"
                    }
                },
                "oncology": {
                    "action": {
                        "all": "TRANSFER"
                    }
                },
                "trauma": {
                    "action": {
                        "all": "TRANSFER"
                    }
                },
                "cardio": {
                    "action": {
                        "all": "TRANSFER"
                    }
                }
            }
        }
    ]
}`);


 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements


 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  let customer = request.body.originalDetectIntentRequest.payload.customer;
  let time = request.body.originalDetectIntentRequest.payload.time;
  
  console.log('Customer data passed - ' +customer);
  
  function getConfigForCustomer(customer_id){
    for(let i=0;i<db.configs.length;i++){
      let config = db.configs[i];
      if(config.customer_id == customer_id){
		 
          return config;
      }
    }
  }
    
  function smartAttendantHandler(agent){
    
    let config = getConfigForCustomer(customer);
    
    if(!config){
        agent.add('Smart Attendant could not figure out a  default response.Contact administrator');
        return; 
    }
      
    
    let message = config.welcome_messages[time];     
   
    if(message){
       agent.add(message);
    }else{
      	agent.add('Welcome to Smart Attendant, This is a default response'); 
    }
   
     if(config.action[time] == 'RESET_CONTEXT'){
      console.log('Clearing followup contexts');
      let context = agent.getContext('smartattendant-level1');
      console.log(`SA context` + JSON.stringify(context));
      agent.clearOutgoingContexts();
      //Need to set lifespan to -1 to cler context
      agent.setContext({name:'smartattendant-level1', lifespan:-1});
    }
    
  }

  function levelOneHandler(agent){
    
     let context = agent.getContext('smartattendant-level1');
     console.log(`L1 context ` + JSON.stringify(context));
    	
    let config = getConfigForCustomer(customer);
    if(!config){
        agent.add('Smart Attendant could not figure out a  default response.Contact administrator');
        return; 
     }
    
    let menu = agent.parameters.level1_dept;
    
    if(config.menus.includes(menu.toLowerCase())){
      
      let menu_config = config.menu_configs[menu.toLowerCase()];
      let action = menu_config.action[time] || menu_config.action.all;
      if(action == 'SET_CONTEXT'){
        let message = menu_config.welcome_messages[time];
      	agent.add(message);
      }else if(action == 'TRANSFER'){
        agent.add(`Trying to connect to someone from ${menu}`);
        agent.setContext({name:'smartattendant-level1', lifespan:-1});
        agent.setContext({name:'smartattendant-level2', lifespan:-1});
      }
      
       
    }else{
       agent.add(`Sorry , we could not find ${menu}, please say that again`);
    }    
    
  }
  
  function levelTwoHandler(agent){
    
    
    	
    let config = getConfigForCustomer(customer);
    if(!config){
        agent.add('Smart Attendant could not figure out a  default response.Contact administrator');
        return; 
    }
      
    
    let menu = agent.parameters.level1_dept;
    let sub_menu = agent.parameters.level2_dept;
    
    let menu_config = config.menu_configs[menu.toLowerCase()];
    
    if(menu_config.menus.includes(sub_menu.toLowerCase())){
      
      let sub_menu_config = menu_config.menu_configs[sub_menu.toLowerCase()];
      let action = sub_menu_config.action[time] || sub_menu_config.action.all;
      if(action == 'TRANSFER'){
        agent.add(`Trying to contact someone from ${menu} in ${sub_menu}`);
      }else{
        agent.add(`Sorry , something went wrong , transferring to agent`);
        agent.clearContext('smartattendant-level1');
        agent.clearContext('smartattendant-level2');
      }
      
       
    }else{
       agent.add(`Sorry , we could not find ${sub_menu}, please say that again`);
    }  
    
  }
  
  
  
  
  let intentMap = new Map();
  
  intentMap.set('SmartAttendant',smartAttendantHandler);
  intentMap.set('SmartAttendant-Level1',levelOneHandler);
  intentMap.set('SmartAttendant-Level2',levelTwoHandler);
  
  agent.handleRequest(intentMap);
});
