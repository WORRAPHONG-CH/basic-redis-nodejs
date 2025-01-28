import express, {Request,Response} from "express";
import bodyParser from "body-parser";
import mysql from "mysql2/promise";
// import { ResultSetHeader } from "mysql2/promise";
import cron from "node-cron";


// app module 
import {User} from "./interface";

const redis = require('redis');
const app = express(); // for handling server
const PORT:number = 8001;

// Create SQL connection 
let mySQLconnection:any = null 
const initMySQL = async () =>{
    let attemps:number = 5;
    // Attemp to connect database 5 times 
    while(attemps){
        try{

            mySQLconnection = await mysql.createConnection({
                host:"mysql",
                user:"root",
                password:"root",
                database:"mydb",
                port:3306 // use internal port to connect mysql
            })

            console.log(`Connect mySQL Successfully`);
            break; //  break while loop when connect mysql successfully
        }
        catch(error:unknown){
            if(error instanceof Error){
                console.log(`ERROR:${error.message}`);
            }
            else{
                console.log(`MySQL Connection Error`);
            }

            attemps--; 
            await new Promise(res=> setTimeout(res,2000)); //wait 2 sec for connection
        }
        
    }
    
};

// Create connection to redis 
let redisConnection:any = null
const initRedis = async () =>{
        try{
            redisConnection = redis.createClient({
                url: 'redis://redis-cache:6379' // use service name for Redis container
            }) // createClient connect to localhost:6379 
            redisConnection.on('error', (err:any) => console.error(`Redis Client Error:`,err.message))
            await redisConnection.connect(); // waiting to connect Redis

            console.log(`Connect Redis Successfully`);
        }
        catch(error:unknown){
            if(error instanceof Error){
                console.log(`ERROR:${error.message}`);
            }
            else{
                console.log(`Redis Connection Error`)
            }
        }
};



// Middleware 
app.use(bodyParser.json()); // รับ body แบบ json



// API Endpoint

// Test API
app.get("/", async (req:Request,res:Response)=>{
    
    res.send("HELLO DOCKER")
    // res.status(200).json({
    //     message: "Hello Sawasdee"
    // })
})

// API endpoint "/users/cache-1" [Lazy Loading(cache aside)] => Get all users, no write cache, write only cache miss
app.get("/users/cache-1", async (req:Request,res:Response)=>{
    try{
        // get users from cache 
        const cacheData = await redisConnection.get("users") // get("key")
        
        // if data found in cache (cache hit)
        if(cacheData){
            const results:User = JSON.parse(cacheData); // parse back to obj
            res.status(200).json({users:results});
            return; // end this line
        }
        // if no user found in cache, fetch data from mysql (cache miss)
        const [results]:User[] = await mySQLconnection.query('SELECT * FROM users');

        // store data in Redis cache 
        const usersString:string = JSON.stringify(results)// result from mySQL needs to convert to string before store to Redis
        await redisConnection.set("users",usersString); // set(key,value)
        
        console.log(usersString);
        res.status(200).json({
            users:results
        })
    }
    catch(error:unknown){
        if(error instanceof Error){
            res.status(500).json({
                error:error.message
            })
        }
        else{
            res.status(500).json({
                error:"Internal Server Error"
            })
        }
    }
})

// API endpoint "users/cache-2" [write through] => similar with Lazy Loading but write cache every new user(post)
app.get("/users/cache-2",async (req:Request,res:Response)=>{
    try{
        // Get data from redis 
        const cacheData:string = await redisConnection.get("users-2"); // get data from key
        // if data found in cache
        if(cacheData){
            const results = JSON.parse(cacheData); // convert back to array(obj1,obj2)
            res.status(200).json({
                users:results
            })
            return;
        };
        // if no data found in cache
        const query:string = `SELECT * FROM users`;
        const [results]:User[] = await mySQLconnection.query(query);

        res.status(200).json({
            users:results
        });
        
    }
    catch(error:unknown){
        if(error instanceof Error){
            res.status(500).json({error:error.message});
        }
        else res.status(500).json({error:"Internal Server Error"});
    };
    
})

// API Endpoint "users/cache-2" [Wrtie Through] => For add new user (read cache write cache,db)
app.post("/users/cache-2",async (req:Request,res:Response)=>{
    try{
        // Get new user(object) from request body (json body)
        let newUser:User = req.body;
        console.log("body newuser:",newUser);

        // Insert user to database
        const [results] = await mySQLconnection.query(`INSERT INTO users SET ?`,newUser);
        newUser.id = results.insertId; // Get id from insertId field sql resposne
        console.log(`result insert:${results}`);

        // Get cache data
        const cacheData = await redisConnection.get('users-2'); // Get cache data (new-key)
        console.log("fetch cacheData: ",cacheData);
        
        // If cache data found (cache hit)
        if(cacheData){
            // Update cache after add new user
            let usersCache = JSON.parse(cacheData); // convert cache data to obj
            usersCache.push(newUser); // push new user to array object
            await redisConnection.set('users-2',JSON.stringify(usersCache)); // convert obj arr to string and update cache
            console.log(usersCache);
        }
        // If cache data not found
        else{
            const [usersCache] = await mySQLconnection.query(`SELECT * FROM users`); // query data from mysql
            console.log("case no cache:",usersCache)
            await redisConnection.set('users-2',JSON.stringify(usersCache)); // update cache by convert data to string
            
        }
        // both are update cache
        res.status(201).json({
            message:"Insert ok",
            newUser});

    }
    catch(error:unknown){
        if(error instanceof Error){
            res.status(500).json({error:error.message});
        }
        else{
            res.status(500).json({error:"Internal Server Error"})
        }
    }
    
    
})

// API Endpoint "users/cache-3" [write back] => For read all users, write user (read cache and write cache,db according scheduler)
app.get("/users/cache-3",async (req:Request,res:Response)=>{
    try{
         // Get cache data
        const cacheData = await redisConnection.get('users-3'); 

        // data cache found
        if(cacheData){
            let cacheResult:User = JSON.parse(cacheData); // convert cache back to arr obj
            res.status(200).json({users:cacheResult});
            return;
        }
        // data cache not found
        const [results] = await mySQLconnection.query(`SELECT * FROM users`); // get users from mysql
        
        res.status(200).json({users:results});

    }catch(error:unknown){
        if(error instanceof Error){
            res.status(500).json({error:error.message});
        }
        else{
            res.status(500).json({error:"Internal Server Error"});
        }
    }
    
})

// API Endpoint "/users/cache-3" [Write Back] => for update user data in cache according to ID user
// use corn-node to scheduler update user data every 10 sec from cache to database
app.put('/users/cache-3/:id', async (req:Request,res:Response)=>{
    try{
        const updateUser:User = req.body; // Get json body from "put" 
        let userId = parseInt(req.params.id); // Get user ID from url params
        updateUser.id = userId; // update body id field from req.params.id

        // get cache data
        let cacheData = await redisConnection.get('users-3'); // store cache data
        let updateIndexCache = (await redisConnection.get('update-index-3')) || []  // if cache update not found, use empty array
        // console.log(updateIndexCache);
        let updateData:User[] = []; // store update array which is for update in cache
        let updateIndexParse:number[] = typeof updateIndexCache === "string"  ? JSON.parse(updateIndexCache): updateIndexCache;  // if string convert to arr | if arr assign arr 
        // console.log("index cache:",updateIndexCache);

        if(cacheData){
            console.log("Cache-3 hit")
            let cacheDataParse:User[] = JSON.parse(cacheData); // parse to obj arr
            let indexForUpdate:number = cacheDataParse.findIndex((user:User)=> user.id === userId);// find index for update
            
            cacheDataParse[indexForUpdate] = updateUser; // update user according to index(id)
            // console.log("index parse:",updateIndexParse);
            updateIndexParse.push(indexForUpdate); // update index list should parse to arr obj (arr.push != "arr".push)
            updateData = cacheDataParse; // assign update data
        }
        // no cache data
        else{
            console.log("cache-3 miss")
            // fetch data from database(mysql)
            const [results] = await mySQLconnection.query('SELECT * FROM users'); // no need to parse cause it's obj
            
            let indexForUpdate:number = results.findIndex((user:User) => user.id === userId);  

            // update cache 
            results[indexForUpdate] = updateUser; // update data 
            updateIndexParse.push(indexForUpdate); // add index for update to cache arr
            updateData = results; // assign update data
        }

        // Update cache [redis.set(key,value)]
        let updateDataString:string = JSON.stringify(updateData); // convert data(obj arr) to string 
        await redisConnection.set('users-3', updateDataString); // updata cache 
        await redisConnection.set('update-index-3',JSON.stringify(updateIndexParse)); 

        // console.log("update data string:",updateDataString)
        res.status(200).json({
            message:"Update ok",
            user: updateUser
        }) 

    }catch(error:unknown){
        if(error instanceof Error){
            res.status(500).json({error:error.message});
        }
        else{
            res.status(500).json({error:"Internal Server Error"});
        }
    }
    
    

})

// Update cache data to database(mysql) every 10 sec
let waiting:boolean = false;
cron.schedule("*/10 * * * * *", async ()=>{
    // console.log("every 10 sec",waiting);
    try{
        // for waiting process
        if(waiting) return;
        
        const cacheData = await redisConnection.get('users-3');
        const updateIndexListCache = await redisConnection.get('update-index-3');

        

        if(updateIndexListCache){
            waiting = true
            // convert string to arr 
            let cacheDataParse =  JSON.parse(cacheData);
            let updateIndexListCacheParse = JSON.parse(updateIndexListCache);

            // loop update data to mysql according to update index in list
            updateIndexListCacheParse.forEach( async (indexForUpdate:number)=>{
                let selectedUser = cacheDataParse[indexForUpdate];
                console.log(selectedUser);
                // Get update user obj to update into database
                let idForUpdate:number = selectedUser.id; // Get id from object field
                console.log(idForUpdate);
                let updateUser:User = {
                    name: selectedUser.name,
                    email: selectedUser.email
                };

                // update to mysql database [UPDATE table SET ? WHERE field=?]
                const [results] = await mySQLconnection.query('UPDATE users SET ? WHERE id = ?',[updateUser,idForUpdate]);

                console.log(results)
                
            })

            // delete index in cache index list after update to database
            await redisConnection.del('update-index-3');
            console.log(`Update Database Successfully`);
            waiting = false; // no waiting after update
        }
    }catch(error:unknown){
        if(error instanceof Error){
            console.log(`ERROR:${error.message}`);
        }
        
        else{
            console.log(`ERROR: Internal Server Error`);
        }
    }
})

app.listen(PORT, async () =>{
    await initMySQL();
    await initRedis();
    console.log(`Server start at localhost:${PORT}`)
})