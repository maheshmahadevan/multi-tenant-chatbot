const express  = require("express");
const app = express();
const detectIntent = require('./Controllers/DetectIntentController');
const bodyParser = require('body-parser');

const port = 3000;

app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(bodyParser.text());

app.get('/',function(req,res){
    res.send("Hello World");
});

app.use('/intent',detectIntent);

app.listen(port, () => console.log(`Started listening at port - ${port}`));

