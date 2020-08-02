const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

//const jsonParser = bodyParser.json();
router.use(bodyParser.urlencoded({extended : true}));
router.use(bodyParser.json());
router.use(bodyParser.text());


router.post('/detectIntent',function(req,res){
    console.log(req.body.test);
    console.log(req.headers);
    res.sendStatus(200);
});

module.exports = router;

