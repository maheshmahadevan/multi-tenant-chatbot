const dialogflow = require('@google-cloud/dialogflow');
const sessionClient = new dialogflow.SessionsClient();


const detectIntentService = (function(){

    async function detectIntent(projectId,
        sessionId,
        query,
        event,
        contexts,
        payload,
        languageCode
      ) {
        // The path to identify the agent that owns the created intent.
        
        const sessionPath = sessionClient.projectAgentSessionPath(
          projectId,
          sessionId
        );
    
        // The text query request.
        const request = {
          session: sessionPath,
          queryParams: {
            payload: payload
          }
          
        };

        if(event){
          request.queryInput = {
            event: {
              name: event,
              languageCode: languageCode
            }
          };
        }else if(query){
          request.queryInput = {
            text: {
              text: query,
              languageCode: languageCode,
            }
          }
        }else{
          throw new Error('Either event or query must be present');
        }
    
        if (contexts && contexts.length > 0) {
          request.queryParams = {
            contexts: contexts,
          };
        }
        console.log("Request sent to dialogflow : " + JSON.stringify(request));
        const responses = await sessionClient.detectIntent(request);
        console.log("Response from dialogflow : "  + JSON.stringify(responses[0]));
        return responses[0];
      }
    

      return {
          detectIntent : detectIntent
      }

})();

module.exports = detectIntentService;