const express = require('express');
const router = express.Router();
const diService = require('../Services/DetectIntentService');
const uuid = require('uuid');



router.post('/detectIntent',async function(req,res){
    console.log(req.body);
    
    try{
        let sessionId = req.body['sessionId'] || uuid.v4();
        if(req.body['event'] && req.body['query']){
            throw new Error('Should contain either Event or Query not both');
        }
        let intentResponse = await diService.detectIntent(req.body['projectId'],sessionId,req.body['query'],req.body['event'],
    req.body['contexts'],req.body['payload'],req.body['languageCode']);
        let response = {
            "sessionId" : sessionId,
            "responseText" : intentResponse.queryResult.fulfillmentText
        }
        
        res.json(response).status(200).send();
    }catch(error){
        console.log(error);
        res.status(404).send(error.message);
    }
    
    
});

module.exports = router;

