require("dotenv").config();
const express=require("express");
const app=express();
const cors=require("cors");
const bcrypt=require("bcryptjs");
const mongoose=require("mongoose");
app.use(express.urlencoded({extended:true}));
app.use(express.json())
app.use(cors());
const port =process.env.port_server ||5000;
const mongoCode=process.env.Mongo_Code;
mongoose.connect(`mongodb+srv://${mongoCode}@montucluster1.m1fch.mongodb.net/?retryWrites=true&w=majority&appName=MontuCluster1`,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{
    console.log("connected database")
}).catch(error=>{
    console.log(error)
})

const eventSchema=new mongoose.Schema({
    name:String,
    description:String,
    date:String,
    category:String,
    image:String
})
const userSchema=new mongoose.Schema({
  name:String,
  email:String,
  password:String,
  userType:String
})
const Events=new mongoose.model("Events",eventSchema);
const User=new mongoose.model("EventUsers",userSchema);
let slatIndex=10;
let hashPassword=async (password)=>{
    return await bcrypt.hash(password,slatIndex);
}
let validPassword=async (password,old_password)=>{
    return await bcrypt.compare(password,old_password);
}

app.post("/login",async (req,res)=>{
  let {email,password}=req.body;
  let user=await User.findOne({email});
  if(user){
      if(await validPassword(password,user.password)){
          res.status(200).send({user,message:"Login Successful"});
      }else{
          res.status(400).send({message:"Check credentials"});
      }
  }else{
      res.status(400).send({message:"Check credentials"});
  }
})
app.post("/register", async (req,res) =>{
  const {name,email,password,userType}=req.body;
  const HashPassword=await hashPassword(password);
  try{
      const user=await User.findOne({email});
      if(user){
          res.status(400).send({message:"Email already exists"});
      }else{
          const newUser=new User({
              name,
              email,
              password:HashPassword,
              userType
          })
          await newUser.save();
          console.log("User added");
          res.send({message:"You are a member now"});
      }
  }
  catch(err){
      console.log(err);
      res.status(500).send({ message: "Error occurred" });
  }
})


app.get("/getEvents", async (req,res) => {    
    try {
        const events=await Events.find();
        if(events){
          res.send({events});
        }
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Error occurred" });
    }
  });

app.post("/createEvent", async (req, res) => {
    const { name,image,date,category,description} = req.body;
    try {
        const newEvent = new Events({
            name,image,date,category,description
        });
        await newEvent.save();
        res.send({ message: "Event added" });
    } 
    catch (error) {
      res.status(500).send({ message: "Error occurred" });
    }
  });
  app.post("/UpdateEvent", async (req, res) => {
    const { name, date, category, description, _id } = req.body;
    try {
        await Events.updateOne(
            { _id }, // Match the document with the provided _id
            { $set: { name, date, category, description } } // Correctly use $set with an object
        );
        res.send({ message: "Event updated" });
    } 
    catch (error) {
        res.status(500).send({ message: "Error occurred", error: error.message });
    }
});

  app.get("/getEvent/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const event=await Events.find({_id:id});

        if(event){
          res.send({event});
        }
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Error occurred" });
    }
  });

  app.delete("/delete/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const event=await Events.deleteOne({_id:id});

        if(event){
          res.send({message:"Event deleted"});
        }
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Error occurred" });
    }
  });

app.listen(port,()=>{
    console.log("Listening on 4000");
})