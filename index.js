import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)



const app = express()
const port = 5000

app.use(express.json())
app.use(cors())

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const mongoClient = await connectToMongoDB()
const myDB = mongoClient.db('PizzaHub')

const users = myDB.collection('user')
const allPizza = myDB.collection('allpizza')
const orderItem = myDB.collection('orderitem')
const payments = myDB.collection('payments')


http://localhost:5000
app.get('/', (req, res) => {
    res.send('Hello World!')
})
//premium user api
app.get('/users/:id/premium', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await users.findOne(query, { projection: { premium: 1 } })
    res.send(result)
})


//get user
app.get('/users', async (req, res) => {
    const query = {}
    if (req.query) {
        if (req.query.role) {
            query.role = req.query.role
        }
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } },
            ]
        }
    }
    const result = await users.find(query).toArray()
    res.send(result)
})

app.post('/addmenu', async (req, res) => {
    const data = req.body
    const result = await allPizza.insertOne(data)
    res.send({ result })
})

app.get('/addmenu/count', async (req, res) => {
    // const data = req.body
    const query = {}
    if (req.query.applicantId) {
        query.vendorId = req.query.applicantId;
    }
    const result = await allPizza.countDocuments(query)
    res.send({ count: result })
})

//all item
app.get('/pizza', async (req, res) => {
    const query = {}
    if (req.query) {

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } },
                { size: { $regex: req.query.search, $options: 'i' } },
                { restaurantName: { $regex: req.query.search, $options: 'i' } },
                { location: { $regex: req.query.search, $options: 'i' } },
            ]
        }
    }

    const result = await allPizza.find(query).toArray()
    res.send(result)

})

app.patch('/pizza/:id', async (req, res) => {
    const { id } = req.params
    const query = { _id: new ObjectId(id) }
    const updatedDoc = {
        $set: {
            status: req.body.status
        }
    }
    const result = await allPizza.updateOne(query, updatedDoc)
    res.send(result)
})

//active item
app.get('/activepizza', async (req, res) => {
    const query = { status: 'active' }
    if (req.query) {

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } },
                { size: { $regex: req.query.search, $options: 'i' } },
                { restaurantName: { $regex: req.query.search, $options: 'i' } },
                { location: { $regex: req.query.search, $options: 'i' } },
            ]
        }
    }

    const result = await allPizza.find(query).toArray()
    res.send(result)

})

//http://localhost:5000/pizzaId/id
app.get('/pizzaId/:id', async (req, res) => {
    const { id } = req.params
    const result = await allPizza.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.get('/pizza/:email', async (req, res) => {
    const { email } = req.params
    const result = await allPizza.find({ email: email }).toArray()
    res.send(result)
})

app.delete('/pizza/:id', async (req, res) => {
    const id = req.params.id
    const result = await allPizza.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})

//http://localhost:5000/pizza
app.get('/pizzaSection', async (req, res) => {

    const result = await allPizza.find({ status: 'active' }).sort({ postDate: -1 }).limit(6).toArray()
    res.send(result)
})

//Customer order with vendor
app.get('/vendorOrder/:vendorId', async (req, res) => {
    const { vendorId } = req.params
    const result = await orderItem.find({ vendorId: vendorId }).toArray()
    res.send(result)
})

app.patch('/vendorOrder/:id', async (req, res) => {
    const { id } = req.params
    const query = { _id: new ObjectId(id) }
    const updatedDoc = {
        $set: {
            status: req.body.status
        }
    }
    const result = await orderItem.updateOne(query, updatedDoc)
    res.send(result)
})

//order item 
app.post('/order', async (req, res) => {
    const data = req.body
    delete data._id
    const result = await orderItem.insertOne(data)
    res.send(result)
})

app.get('/myOrder/:email', async (req, res) => {
    const email = req.params.email
    const result = await orderItem.find({ useremail: email }).toArray()
    res.send(result)
})

app.delete('/myOrder/:id', async (req, res) => {
    const id = req.params.id
    const result = await orderItem.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})


//Payment api
app.post('/payments/checkout-verify', async (req, res) => {
    const { sessionId } = req.body

    if (!sessionId) {
        return res.send({ success: false, message: "SessionId is required" })
    }

    const {
        status,
        payment_status,
        customer_email,
        metadata,
        payment_intent
    } = await stripe.checkout.sessions.retrieve(sessionId);

    //insert serssionId into payment collection
    if (status === 'complete' && payment_status === 'paid') {

        const sessionsQuery = { sessionId }
        const existingPayment = await payments.findOne(sessionsQuery)
        if (existingPayment) {
            return res.send({ success: false, message: "Payment already verified" })
        }

        const payment = {
            sessionId,
            status,
            payment_status,
            customer_email,
            userId: metadata.userId,
            payment_date: new Date(),
            payment_intent
        }

        const result = await payments.insertOne(payment)
        const query = { _id: new ObjectId(metadata.userId) }

        const updatedDoc = {
            $set: {
                premium: true,
            }
        }
        const updateResult = await users.updateOne(query, updatedDoc)

        res.send({ success: true, result, updateResult })
        return
    }

    res.send({ success: false, message: "payment verification failed" })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})