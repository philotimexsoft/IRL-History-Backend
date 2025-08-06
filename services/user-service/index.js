require("dotenv").config({path: "Config/dev.env"});
const app = require("./app");

const PORT = process.env.PORT || 6000;

app.listen(PORT,"0.0.0.0",(err) => {
    if(err){
        return err;
    }
    console.log(`Listening on ${PORT}`);
});
