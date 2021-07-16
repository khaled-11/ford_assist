const mysql = require('mysql');
const CryptoJS = require("crypto-js");
const axios = require ("axios");
var querystring = require('querystring');

// Pool connection for the database
var pool  = mysql.createPool({
    connectionLimit : 90,
    host     : process.env.dbHOST,
    user     : process.env.dbUSER,
    password : process.env.dbPSWD,
    database : 'house'
  });

/// Function to Get App Traits ///
module.exports = async () => {
  try{
    var cre_data;     
    var query = pool.query('select * from env_var;');
    query
    .on('result', async function(row) {
        cre_data = row
        console.log("Reading Env variables!")
    })
    .on('end', async function() {
        var bytes  = CryptoJS.AES.decrypt(cre_data.accessToken, process.env.KEY);
        var acToken = bytes.toString(CryptoJS.enc.Utf8); 
        var url = `https://api.mps.ford.com/api/fordconnect/vehicles/v1`
        axios.get(url,{
            headers: { 
                "Accept": "application/json",
                "Content-Type": "application/json",
                "api-version": cre_data.api_version,
                "Application-Id":cre_data.applicationId,
                "Authorization": `Bearer ${acToken}`
            }
        }).then(function(response) {
            console.log("Vehicle ID updates!")
            console.log(response.data.vehicles[0].vehicleId);  
            var query = pool.query(`update env_var SET vehicleId = "${response.data.vehicles[0].vehicleId}";`);
            query
            .on('error', function(err) {
                console.log(err)
            })
            .on('result', async function(row) {
                console.log(row)
                return;
            })
        }).catch(function(error){
            console.log(error)
        });
    })
  }
  catch (e){
    return;
  }
};

