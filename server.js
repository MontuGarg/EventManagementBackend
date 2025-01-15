require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io"); // Import Socket.IO
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const port = process.env.port_server || 5000;
const mongoCode = process.env.Mongo_Code;

// Setup HTTP server and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow any origin for simplicity
  },
});

mongoose
  .connect(
    `mongodb+srv://${mongoCode}@montucluster1.m1fch.mongodb.net/?retryWrites=true&w=majority&appName=MontuCluster1`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to database");
  })
  .catch((error) => {
    console.log(error);
  });

const eventSchema = new mongoose.Schema({
  name: String,
  description: String,
  date: String,
  category: String,
  image: String,
  attendees: { type: Number, default: 0 },
  visitedEvents: [],
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  userType: String,
  
});

const Events = mongoose.model("Events", eventSchema);
const User = mongoose.model("EventUsers", userSchema);

let saltIndex = 10;
let hashPassword = async (password) => {
  return await bcrypt.hash(password, saltIndex);
};
let validPassword = async (password, old_password) => {
  return await bcrypt.compare(password, old_password);
};

// WebSocket logic
io.on("connection", (socket) => {
console.log("A user connected:", socket.id);

  // Listen for "visitEvent" event
socket.on("visitEvent", async ({ userId, eventId }) => {
    try {
      const event1 = await Events.findById(eventId);

      console.log(event1.visitedEvents.includes(userId),userId);
      if (!event1.visitedEvents.includes(userId)) {
        // Add the event ID to the user's visited events
        event1.visitedEvents.push(userId);
        await event1.save();

        // Increment the attendees count for the event
        await Events.updateOne(
          { _id: eventId },
          { $inc: { attendees: 1 } }
        );

        // Emit the updated attendee count to the client
        socket.emit("eventUpdated", { attendees:event1.attendees+1 });
      } else {
        socket.emit("eventUpdated", { message: "Event already visited" });
      }
    } catch (error) {
      console.log(error);
      socket.emit("error", { message: "Error occurred" });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

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
            name,image,date,category,description,
            visitedEvents: [],
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


// RESTful API endpoints
app.post("/register", async (req, res) => {
  const { name, email, password, userType } = req.body;
  const hashedPassword = await hashPassword(password);
  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(400).send({ message: "Email already exists" });
    } else {
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        userType
      });
      await newUser.save();
      res.send({ message: "Registration Successful" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Error occurred" });
  }
});



// Start the server
server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
