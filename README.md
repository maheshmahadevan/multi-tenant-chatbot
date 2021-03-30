# Multi-tenant Chatbot using Dialogflow

## Setup

Please follow this [article](https://blog.maheshmahadevan.com/a-multi-tenant-chatbot-with-dialogflow-part-2-implementation-79c049393f89) on setup which describes the below steps in details with screenshots. 
In short, you will need to follow below steps.

* Clone this repository
* Sign-in to Dialogflow and create an [account](https://cloud.google.com/dialogflow/docs/editions#es-agent).
* Create Agent and Intents.Follow the [guide](https://blog.maheshmahadevan.com/a-multi-tenant-chatbot-with-dialogflow-part-2-implementation-79c049393f89) which has step-by-step instructions on how to do this.
* Set up Authentication as directed in this [link](https://cloud.google.com/docs/authentication/getting-started)
* Set up Fulfillment webhook. Follow the [guide](https://blog.maheshmahadevan.com/a-multi-tenant-chatbot-with-dialogflow-part-2-implementation-79c049393f89).
* Invoke the Intent Detection API. Examples below.

## REST Call Examples

```
---First call to initiate Smart Attendant for customer abc_car during the afternoon time. Feel free to change the time to evening to see the response---
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/intent/detectintent -d '{ "projectId": "<YOUR_GCP_PROJECT>", "event": "SMART_ATTENDANT", "languageCode" : "en-US", "payload" : { "fields" : { "customer" : { "stringValue": "abc_car", "kind": "stringValue" }, "time" : { "stringValue": "afternoon", "kind": "stringValue" } } } }'

---Response---
{
    "sessionId": "dfeaacwf-6d7f-4a05-ab3e-da2b98f72c2b",
    "responseText": "Welcome to ABC Car Dealership, please say in words where you want to redirect your call , for example , say Sales or Connect me to Service"
}

---Second call.User wishes to speak to a Sales agent, use the sessionId from first response in the input json. ---
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/intent/detectintent -d '{ "sessionId": "<SESSION_ID_FROM_PREVIOUS_RESPONSE>", "projectId": "<YOUR_GCP_PROJECT>", "query": "Sales please", "languageCode" : "en-US", "payload" : { "fields" : { "customer" : { "stringValue": "abc_car", "kind": "stringValue" }, "time" : { "stringValue": "afternoon", "kind": "stringValue" } } } }'

--Response. Since this particular Departments has sub-departments, the intent responds back asking to which specific Sales department does User wish to speak---
{"sessionId":"<SESSION_ID_FROM_PREVIOUS_RESPONSE>",
"responseText":"BMW , Audi or Mercedes"}

---Third Call ... User wishes to speak to a Mercedes agent---
curl -X POST -H 'Content-Type: application/json' http://localhost:3000/intent/detectintent -d '{ "sessionId": "<SESSION_ID_FROM_PREVIOUS_RESPONSE>", "projectId": "<YOUR_GCP_PROJECT>", "query": "Mercedes", "languageCode" : "en-US", "payload" : { "fields" : { "customer" : { "stringValue": "abc_car", "kind": "stringValue" }, "time" : { "stringValue": "afternoon", "kind": "stringValue" } } } }'

--- Final Response and completion of Intent, User will be redirected to Mercedes Sales agent ---
{"sessionId":"<SESSION_ID_FROM_PREVIOUS_RESPONSE>",
"responseText":"Trying to contact someone from Sales in Mercedes"
```

    