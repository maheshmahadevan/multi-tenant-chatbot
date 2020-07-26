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
      "customer_id": "abc",
      "welcome_messages": {
        "morning": "Welcome to ABC company , please say in words where you want to redirect your call , for example , say Sales or Connect me to Marketing",
        "afternoon": "Welcome to ABC company , please say in words where you want to redirect your call , for example , say Sales or Connect me to Marketing",
        "evening": "Welcome to ABC company, Sorry we are closed at this hour , please call back during working hours"
      },
      "action": {
        "morning": "SET_CONTEXT",
        "afternoon": "SET_CONTEXT",
        "evening": "RESET_CONTEXT"
      },
      "menus": [
        "sales",
        "marketing",
        "customer care"
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
        "marketing": {
          "action": {
            "all": "TRANSFER"
          }
        },
        "customer care": {
          "action": {
            "all": "TRANSFER"
          }
        }
      }
    },
    {
      "customer_id": "hospital",
      "welcome_messages": {
        "morning": "Welcome to Health General Hospital. , please say in words where you want to redirect your call , for example , say Radiology or Connect me to Heart Care",
        "afternoon": "Welcome to Health General Hospital. , please say in words where you want to redirect your call , for example , say Radiology or Connect me to Heart Care",
        "evening": "Welcome to Health General Hospital. , please say in words where you want to redirect your call , for example , say Radiology or Connect me to Heart Care"
      },
      "action": {
        "morning": "SET_CONTEXT",
        "afternoon": "SET_CONTEXT",
        "evening": "SET_CONTEXT"
      },
      "menus": [
        "radiology",
        "heart care",
        "pharmacy"
      ],
      "menu_configs": {
        "radiology": {
          "action": {
            "all": "TRANSFER"
          }
        },
        "heart care": {
          "action": {
            "all": "TRANSFER"
          }
        },
        "pharmacy": {
          "action": {
            "all": "TRANSFER"
          }
        }
      }
    }
  ]
}`);


const directory = JSON.parse(`{
  "contacts": [
    {
      "id": "johns",
      "name": "John Smith",
      "email": "johns@example.com",
      "mobile": "+1-333-444-5555"
    },
    {
      "id": "jimh",
      "name": "Jim Hacker",
      "email": "jimh@example.com",
      "mobile": "+1-333-445-6666"
    },
    {
      "id": "sarahc",
      "name": "Sarah Connor",
      "email": "sarahc@example.com",
      "mobile": "+1-333-445-6676"
    },
    {
      "id": "jackr",
      "name": "Jack Rayn",
      "email": "jackr@example.com",
      "mobile": "+1-333-445-6677"
    }
  ],
  "groups": [
    {
      "id": "g1",
      "name": "Sales",
      "members": [
        "johns",
        "jimh"
      ]
    },
    {
      "id": "g2",
      "name": "Marketing",
      "members": [
        "sarahc",
        "jackr"
      ]
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
  
  console.log('Customer ' +customer);
  
  function getConfigForCustomer(customer_id){
    for(let i=0;i<db.configs.length;i++){
      let config = db.configs[i];
      if(config.customer_id == customer_id){
		 
          return config;
      }
    }
  }
  
  let contacts = {};
  let groups = {};
  
  let contacts_idx = lunr(function() {
    this.ref('id');
    this.field('name');	
    
   directory.contacts.forEach(function(con){
        this.add(con);
		contacts[con.id] = con;
    },this);
  });
  
  console.log(' Contacts List :' + JSON.stringify(contacts));
  
  let group_idx = lunr(function() {
    this.ref('id');
    this.field('name');	
    
   directory.groups.forEach(function(grp){
        this.add(grp);
		groups[grp.id] = grp;
    },this);
    
  });
  
  console.log(' Groups List :' + JSON.stringify(groups));
  
  function searchContacts(name){    
    let matched = contacts_idx.search(name);
    console.log('Matched contacts : ' + JSON.stringify(matched));
    
    let results = [];
    for(let i=0;i<matched.length;i++){
      	results.push(contacts[matched[i].ref]);
    }
    return results;
  }
  
  function searchGroups(name){    
    let matched = group_idx.search(name);
    console.log('Matched groups :' + JSON.stringify(matched));
    
    let results = [];
    for(let i=0;i<matched.length;i++){
      	results.push(groups[matched[i].ref]);
    }
    return results;
	
  }
  
  function welcome(agent) {
    if(customer === 'abc'){
      agent.add('Welcome to our agent , ABC');
    }else{
      agent.add(`Welcome to my agent!`);
    }
    
  }
 
  function fallback(agent) {
    //agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  
  function callByNameHandler(agent){
     if(agent.action == 'FIND_CONTACT_DIAL_IF_EXACT_MATCH')
     {
       let name = agent.parameters['given-name'];
       let lname = agent.parameters['last-name'];
       
       if(name && name.length > 0){
         if(name === 'John'){
           
           agent.add(`Too many ${name}s' , please provide a Last Name`);
           agent.setContext({ name: 'get_last_name', lifespan: 1, parameters: { 'given-name': name }});
          // agent.setFollowupEvent('last_name_not_found');
         }else{
         	agent.add(`Finding ${name} ${lname}` );
         }
       }
       
       
     }
     else{
     	//console.log(`agent.parameters.given-name`);
        //agent.add(`${agent.action}`);
     	agent.add('Ok, let me try'); 
     }
  }
  
  function getLastNameHandler(agent){
    if(agent.action == 'FIND_CONTACT_DIAL_WITH_FIRST_LAST_NAME'){
       	let name = agent.parameters['given-name'];
       	let lname = agent.parameters['last-name'];
      
        if(lname && lname.length > 0 ){
           agent.add(`Finding ${name} ${lname}` );
           agent.clearContext('get_last_name');
        }       
        
     }
    
  }
  
  function virtualAAHandler(agent){
    
    let config = getConfigForCustomer(customer);
    
    if(!config)
      return;
    
    let message = config.welcome_messages[time];     
   
    
    if(message){
       agent.add(message);
    }else{
      	agent.add('Welcome to Virtual Attendant'); 
    }
   
     if(config.action[time] == 'RESET_CONTEXT'){
      console.log('Clearing context connect_level_1');
      let context = agent.getContext('connect_level_1');
      console.log(`VAHandler context` + JSON.stringify(context));
      agent.clearOutgoingContexts();
      agent.setContext({name:'connect_level_1', lifespan:-1});
    }
    
  }

  function connectL1Handler(agent){
    
     let context = agent.getContext('connect_level_1');
     console.log(`Connect L1 Handler context ` + JSON.stringify(context));
    	
    let config = getConfigForCustomer(customer);
    if(!config)
      return;
    
    let menu = agent.parameters.level1_dept;
    
    if(config.menus.includes(menu.toLowerCase())){
      
      let menu_config = config.menu_configs[menu.toLowerCase()];
      let action = menu_config.action[time] || menu_config.action.all;
      if(action == 'SET_CONTEXT'){
        let message = menu_config.welcome_messages[time];
      	agent.add(message);
      }else if(action == 'TRANSFER'){
        agent.add(`Trying to connect to someone from ${menu}`);
        agent.setContext({name:'connect_level_1', lifespan:-1});
        agent.setContext({name:'connect_level_2', lifespan:-1});
      }
      
       
    }else{
       agent.add(`Sorry , we could not find ${menu}, please say that again`);
    }    
    
  }
  
  function connectL2Handler(agent){
    
    
    	
    let config = getConfigForCustomer(customer);
    if(!config)
      return;
    
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
        agent.clearContext('connect_level_1');
        agent.clearContext('connect_level_2');
      }
      
       
    }else{
       agent.add(`Sorry , we could not find ${sub_menu}, please say that again`);
    }  
    
  }
  
  function successResponse(agent,participant_list,date_time_info,duration){
	  
	  let res = 'Setting meeting with ';
      for(let i=0;i<participant_list.length;i++){
       res += participant_list[i].name + '(' + participant_list[i].email + ')';
       if(participant_list.length > (i+1)){
         res += ((i+1) == (participant_list.length -1 )) ? ' and ' : ',';
       }
      }
    
      if(date_time_info.find_first_slot){
        res+= ' at first available slot ';
      }else{
        res += ' on ';
        res += date_time_info.date;
        res += ' at ';
        res += date_time_info.time;
      }
      
      res += ' for ';
      res += duration.amount;
      if(duration.unit == 'min'){
       res += ' minutes'; 
      }else if(duration.unit == 'h'){
       res += ' hours'; 
      }
    
	  agent.add(res);
	  
  }
  
  function missingInfoResponse(agent,missingInfo){
    let res = 'Please provide ';
    for(let i=0;i<missingInfo.length;i++){
     res += missingInfo[i];
     if(missingInfo.length > (i+1)){
       res += ((i+1) == (missingInfo.length -1 )) ? ' and ' : ',';
     }
    }
    res += ' to set the meeting';
    
    agent.add(res);         
    
  }
  
  function findParticipants(participants,participant_list,missingInfo){
	let flagMiss = false;
	
	if(!participants){
      missingInfo.push('participants list');     
      flagMiss = true;
    }else{
      const name = participants.name;
      const groups = participants.groups;
      
      if(name && !groups){
        const first_name = name['given-name'];
        const last_name = name['last-name'];
        
        let search_name = (first_name ? first_name : '' ) + ' ' + (last_name ? last_name : '');
        search_name = search_name.trim();
        console.log(`Searching for ${search_name}`);
        let matched = searchContacts(search_name);
        
        if(matched.length !=1){
          console.log(`Could not find match for ${search_name}`);
          missingInfo.push('exact name');
          flagMiss = true;
       }else{
			participant_list.push(matched[0]);
		}             
        
      }
      
      if(!name && groups){
         let matched = searchGroups(groups);
        	
         if(matched.length !=1){
          missingInfo.push('correct group');
          flagMiss = true;
        }else{
          	console.log('matched group members :');
			matched[0].members.forEach(function(member){
               	console.log(' ' + member + ',' + JSON.stringify(contacts[member]));
				participant_list.push(contacts[member]);
			});
		}
      }
      
    }
	
	return flagMiss;
	  
  }
  
  function filterDateAndTime(startDateAndTime,date_time_info,missingInfo){
	let flagMiss = false;
	
	if(!startDateAndTime){
      missingInfo.push('date');
	  missingInfo.push('start time');
      flagMiss = true;
    }else{
      const date = startDateAndTime.date;
      const time = startDateAndTime.time;
      
      const asap = startDateAndTime.relative_time;
      
      const time_period = startDateAndTime['time-period'];
      
      if(asap){
        date_time_info['find_first_slot'] = true;
      }else{
      
      	if(date && !time && !time_period){
          missingInfo.push('start time');
          flagMiss = true;
        }else if(!date && (time || time_period)){
          missingInfo.push('date');
          flagMiss = true;
        }else{
		  date_time_info['date'] = new Date(date).toLocaleDateString('en-IN');
          if(time){
            date_time_info['time'] = new Date(time).toLocaleTimeString('en-IN');
          }else{
            date_time_info['time'] = new Date(time_period.startTime).toLocaleTimeString('en-IN');
          }
          
		}
        
      }
    }
	
	return flagMiss;
  }
  
  function setMeetingHandlerHelper(agent,participants,duration,startDateAndTime){
    
    let participant_list = [];
    let date_time_info = {};
    
    let flagMiss = false;
	let missingInfo = [];
    
	flagMiss = findParticipants(participants,participant_list,missingInfo);
    
    flagMiss = filterDateAndTime(startDateAndTime,date_time_info,missingInfo);
    
    if(!duration || !duration.amount || !duration.unit){
      missingInfo.push('duration');
      flagMiss = true;
    }       
   
    
    if(flagMiss){
      	missingInfoResponse(agent,missingInfo);
      	agent.setContext({ name: 'setmeeting-followup', lifespan: 5, parameters: { 'participants': participants, 'startDateAndTime' : startDateAndTime , 'duration' : duration}});
     }else{
      	successResponse(agent,participant_list,date_time_info,duration);
        agent.setContext({name:'setmeeting-followup', lifespan:-1});
    }
           
  }
  
  function setMeetingHandler(agent){
    
    const participants = agent.parameters['participants'];
    const duration = agent.parameters['duration'];
    const startDateAndTime = agent.parameters['startDateAndTime'];
    
    
	setMeetingHandlerHelper(agent,participants,duration,startDateAndTime);
    
    
  }
  
  
  
  function setMeetingFUHandler(agent){
    
    let new_participants = agent.parameters['participants'];
    let new_duration = agent.parameters['duration'];
    let new_startDateAndTime = agent.parameters['startDateAndTime'];
    
    let ctx_participants = agent.parameters['ctx_participants'];
    let ctx_duration = agent.parameters['ctx_duration'];
    let ctx_startDateAndTime = agent.parameters['ctx_startDateAndTime'];
    
    const participants = Object.assign({},ctx_participants,new_participants);
    const duration = Object.assign({},ctx_duration,new_duration);
    const startDateAndTime = Object.assign({},ctx_startDateAndTime,new_startDateAndTime);
    
    console.log('Set Meeting - More Info Handler : participants : ' + JSON.stringify(participants));
    console.log('Set Meeting - More Info Handler : duration : ' + JSON.stringify(duration));
    console.log('Set Meeting - More Info Handler : startDateAndTime : ' + JSON.stringify(startDateAndTime));
    
    setMeetingHandlerHelper(agent,participants,duration,startDateAndTime);
  }
  
  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/dialogflow-fulfillment-nodejs/tree/master/samples/actions-on-google
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('call_by_name', callByNameHandler);
  intentMap.set('get_last_name',getLastNameHandler);
  intentMap.set('Virtual Attendant Welcome Intent',virtualAAHandler);
  intentMap.set('Connect To Department ( Level 1)',connectL1Handler);
  intentMap.set('Connect To Sub-Department ( Level 2)',connectL2Handler);
  intentMap.set('Set Meeting',setMeetingHandler);
  intentMap.set('Set Meeting - More Info',setMeetingFUHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
