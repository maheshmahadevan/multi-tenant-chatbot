const express  = require("express");
const app = express();
const detectIntent = require('./Controllers/DetectIntentController');

const port = 3000;

app.get('/',function(req,res){
    res.send("Hello World");
});

app.use('/intent',detectIntent);

app.listen(port, () => console.log(`Started listening at port - ${port}`));

