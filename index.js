const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const SSLCommerzPayment = require('sslcommerz-lts')
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jelibxa.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false //true for live, false for sandbox

function generateTransactionId() {
  const extraLetter = "D"; // Replace with your desired extra letter
  const currentDate = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // Format: YYMMDD
  const currentTime = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }).replace(/:/g, ""); // Format: HHMM
  const randomDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, "0"); // Generate 8-digit random number

  return `${extraLetter}${currentDate}-${currentTime}-${randomDigits}`;
}

async function run() {
  try {
    client.connect();

    const usersCollection = client.db('doc-meet').collection('users');
    const ambulanceCollection = client.db('doc-meet').collection('ambulance');
    const donorsCollection = client.db('doc-meet').collection('bloodDonors');
    const appointmentsCollection = client.db('doc-meet').collection('appointments');
    const paymentsCollection = client.db('doc-meet').collection('payments');


    // checking weather admin or not 
    app.get('/', async (req, res) => {
      res.send("DocMeet is online");
    })

    // creating user 
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        console.log('user already exists');
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      console.log("new user created : ", result);
      res.send(result);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    // checking weather an user is instructor  or not 
    app.get("/users/instructor/:email", async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email === email) {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const result = { instructor: user?.role === "instructor" };
        res.send(result);
      } else {
        res.send({ instructor: false });
      }
    });


    // geting user 
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      console.log("users :", result);
      res.send(result);
    });
    // geting doctors 
    app.get('/admin/doctors', async (req, res) => {
      const query = { role: "doctor" }
      const result = await usersCollection.find(query).toArray();
      console.log("users :", result);
      res.send(result);
    });
    // geting patients 
    app.get('/admin/patients', async (req, res) => {
      const query = { role: "patient" }
      const result = await usersCollection.find(query).toArray();
      console.log("users :", result);
      res.send(result);
    });
    // geting ambulance 
    app.get('/admin/ambulance', async (req, res) => {
      const result = await ambulanceCollection.find().toArray();
      res.send(result);
    });

    // deleting ambulance 
    app.delete('/admin/ambulance/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      result = await ambulanceCollection.deleteOne(query);
      res.send(result);
    })

    // geting blood donors 
    app.get('/admin/donors', async (req, res) => {
      const result = await donorsCollection.find().toArray();
      res.send(result);
    });



    // updating patient info api 
    app.patch('/users/patient/profile-update/:email', async (req, res) => {
      const email = (req.params.email);

      const filter = { email: email };
      const body = req.body;
      let updateDoc = {
        $set: {
          photoURL: body.photoURL,
          age: body.age,
          phone: body.phone,
          birthDate: body.birthDate,
          weight: body.weight,
          bloodGroup: body.bloodGroup,
          nid: body.nid,
          bio: body.bio,
          status: body.status,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    });

    // updating doctor info api 
    app.patch('/users/doctor/profile-update/:email', async (req, res) => {
      const email = (req.params.email);

      const filter = { email: email };
      const body = req.body;

      let updateDoc = {
        $set: {
          photoURL: body.photoURL,
          age: body.age,
          phone: body.phone,
          birthDate: body.birthDate,
          weight: body.weight,
          bloodGroup: body.bloodGroup,
          degree: body.degree,
          speciality: body.speciality,
          area: body.area,
          nid: body.nid,
          bio: body.bio,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    });
    // updating doctor schedules and fees info api 
    app.patch('/users/doctor/schedules-update/:email', async (req, res) => {
      const email = (req.params.email);

      const filter = { email: email };
      const body = req.body;
      const schedules = req.body.schedules.split(",");

      console.log(schedules);
      let updateDoc = {
        $set: {
          schedules: schedules,
          fees: body.fees
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    });

    // updating doctor live status and meet link info api 
    app.patch('/users/doctor/live-status-update/:email', async (req, res) => {
      const email = (req.params.email);

      const filter = { email: email };
      const body = req.body;
      console.log(body);

      let updateDoc = {
        $set: {
          liveLink: body.liveLink,
          liveStatus: body.liveStatus,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    });


    // get role 
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email
      };
      const result = await usersCollection.findOne(query);
      res.send(result);
    })

    // role changing
    app.patch('/users/admin/:email', async (req, res) => {
      const email = (req.params.email);
      const role = req.body.role;
      const filter = { email: email };
      let updateDoc = {
        $set: {
          role: role
        },
      };
      if (role === "doctor") {
        const doctorUniqueId = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
        updateDoc = {
          $set: {
            role: role,
            totalPatients: parseInt("0"),
            doctorUniqueId: doctorUniqueId,
            schedules: ""
          },
        };
        console.log("user is now doctor!");
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get searched doctor 
    app.get('/doctors', async (req, res) => {
      const { area, speciality } = req.query;
      const query = {
        area: area,
        speciality: speciality,
      };

      console.log(query);

      const result = await usersCollection.find(query).toArray();
      res.send(result);

    });
    // get searched doctor by doctor id
    app.get('/doctor/:id', async (req, res) => {
      const id = parseInt(req.params.id);
      const query = {
        doctorUniqueId: id,
      };
      console.log(query);

      const result = await usersCollection.findOne(query);
      console.log(result);
      res.send(result);

    });
    // get popular doctors 
    app.get('/popular-doctors', async (req, res) => {
      const query = {
        role: "doctor"
      };
      const result = await usersCollection.find(query).toArray();
      res.send(result);

    });



    // ------------------------------------------------appontment booking api ---------------------------------------

    app.post('/appointment/payment', async (req, res) => {
      const appointment = req.body;
      // console.log(appointment);
      const price = req.body.fees;
      const transactionId = generateTransactionId();
      // console.log("tran id : ", transactionId);


      const data = {
        total_amount: price,
        currency: 'BDT',
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `http://localhost:5000/payment/success/${transactionId}`,
        fail_url: 'http://localhost:3030/fail',
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: appointment.patientName,
        cus_email: appointment.patientEmail,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: appointment.phone,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };
      console.log(data);
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
          // Redirect the user to payment gateway
          let GatewayPageURL = apiResponse.GatewayPageURL;
          res.send({ url: GatewayPageURL});

          const finalOrder = {
            patientName: appointment.patientName,
            patientEmail: appointment.patientEmail,
            age: appointment.age,
            phone: appointment.phone,
            doctorName: appointment.doctorName,
            doctorEmail: appointment.doctorEmail,
            scheduledTime: appointment.scheduledTime,
            appointmentDate: appointment.appointmentDate,
            fees: appointment.fees,
            doctorId: appointment.doctorId,
            transactionId: transactionId,
            paidStatus: false,
            approvedStatus: "Not approved",
          };
          const result = paymentsCollection.insertOne(finalOrder);
          const appointmentUpdate = appointmentsCollection.insertOne(finalOrder);
          console.log('Redirecting to: ', GatewayPageURL);
      });


      app.post('/payment/success/:tranId', async(req,res)=>{
        console.log(req.params.tranId);

        const result =await paymentsCollection.updateOne({transactionId: req.params.tranId},
          {
          $set: {
            paidStatus: true,
            approvedStatus: "approved",
          },
        });
        
        const result1 =await appointmentsCollection.updateOne({transactionId: req.params.tranId},
          {
          $set: {
            paidStatus: true,
            approvedStatus: "approved",
          },
        });

        if(result.modifiedCount>0 && result1.modifiedCount>0){
          res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`);
        }
      });

      





      // const result = await appointmentsCollection.insertOne(newAppointment);
      // console.log("new appointment created : ", result);
      // res.send(result);
    });

    // ---------------------------------------------------will work lately------------------
    app.post('/appointment', async (req, res) => {
      const newAppointment = req.body;
      console.log(newAppointment);
      // const existingUser = await usersCollection.findOne(query);

      // if (existingUser) {
      //   console.log('user already exists');
      //   return res.send({ message: 'user already exists' })
      // }

      const result = await appointmentsCollection.insertOne(newAppointment);
      console.log("new appointment created : ", result);
      res.send(result);
    });


    // --------------------------------------------------get all appointments according to email --------------------------------

    app.get('/patient/appointments/:email', async (req, res) => {
      const email = req.params.email;
      const query = { patientEmail: email };

      const result = await appointmentsCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/patient/payments/:email', async (req, res) => {
      const email = req.params.email;
      const query = { patientEmail: email };

      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    })


    //   get all instructors data 

    // app.get('/instructors', async (req, res) => {
    //   let query ;
    //   query = {role : "instructor"}
    //   result = await usersCollection.find(query).toArray();
    //   console.log(result);
    //     res.send(result);
    //   })


    // //   get all classes data 

    // app.get('/classes', async (req, res) => {
    //     const cursor = classCollection.find();
    //     const result = await cursor.toArray();
    //     res.send(result);
    //   })

    //   // change class status 
    //   app.patch('/class-status/:classId', async (req, res)=>{
    //     const classId = req.params.classId;
    //     console.log("class Id : ", classId);
    //     const Status = req.body.Status;
    //     const filter = { _id: new ObjectId(classId) };
    //   const updateDoc = {
    //     $set: {
    //       classApprovedStatus: Status,
    //     },
    //   };
    //   const result = await classCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    //   })

    //   // feed back api 
    //   app.patch('/feedback/:id', async (req, res) => {
    //     const id = req.params.id;
    //     const filter = { _id: new ObjectId(id) };
    //     const feedback = req.body;
    //     console.log(feedback);

    //     const updatedFeedback = {
    //       $set:
    //       feedback
    //     };
    //     const result = await classCollection.updateOne(filter, updatedFeedback);
    //     res.send(result);

    //   })


    //   // Add a class api
    // app.post('/classes', async (req, res) => {
    //   const insertData = req.body;

    //   const result = await classCollection.insertOne(insertData);
    //   console.log("new class added : ",result);
    //   res.send(result);
    // });

    // // get my classes 
    // app.get('/classes/:email', async (req, res) => {
    //   const email = req.params.email;
    //   const query = {instructorEmail : email}
    //   result = await classCollection.find(query).toArray();
    //   console.log(result);
    //     res.send(result);
    //   })


    //    //booked classes api
    // app.post("/bookedclass", verifyJWT, async (req, res) => {
    //   const data = req.body.bookedClass;
    //   const email = data.user_email;
    //   const id = data.class_id;
    //   const query = {
    //     class_id: id,
    //     user_email: email,
    //   };
    //   const checkData = await bookedClassCollections.find(query).toArray();
    //   if (checkData.length > 0) {
    //     res.send("available");
    //   } else {
    //     const result = await bookedClassCollections.insertOne(data);
    //     res.send(result);
    //   }
    // });
    // app.delete("/bookedclass/:id", verifyJWT, async (req, res) => {
    //   const id = req.params.id;
    //   console.log(id);
    //   const query = { class_id: id };
    //   const result = await bookedClassCollections.deleteOne(query);
    //   res.send(result);
    // });
    // app.get("/bookedclass/:email", verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   const query = { user_email: email };
    //   const result = await bookedClassCollections.find(query).toArray();
    //   res.send(result);
    // });
    // //payments

    // //enrolled class api
    // app.get("/enrollclass/:email", verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   const query = {
    //     user_email: email,
    //   };
    //   const result = await enrolledClassCollections.find(query).toArray();
    //   res.send(result);
    // });


    //    //create payment intent
    // app.post("/create-payment-intent", verifyJWT, async (req, res) => {
    //   console.log("inside payment intent");
    //   const { price } = req.body;
    //   const amount = price * 100;
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: amount,
    //     currency: "usd",
    //     payment_method_types: ["card"],
    //   });
    //   console.log("payment client secret", paymentIntent.client_secret);
    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    // //payment related api created
    // app.get("/payments/:email", verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };
    //   const result = await paymentCollections.find(query).sort({ date: -1 }).toArray();
    //   res.send(result);
    // });
    // app.post("/payments", verifyJWT, async (req, res) => {
    //   const payment = req.body;
    //   const result = await paymentCollections.insertOne(payment);
    //   // add to my class collection
    //   const myClassResult = await enrolledClassCollections.insertOne(payment.class);

    //   const find = { class_id: payment?.class_id };
    //   const query = { _id: new ObjectId(payment?.class_id) };
    //   //update enroll student and available seats
    //   const updatedClass = {
    //     $inc: {
    //       enroll_students: 1,
    //       availableSeat: -1,
    //     },
    //   };

    //   const updateResult = await classCollection.updateOne(query, updatedClass);
    //   // delete from booked
    //   const deleteResult = await bookedClassCollections.deleteOne(find);
    //   res.send({ result, myClassResult, updateResult, deleteResult });
    // });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`DocMeet server is running on ${port}`)
})