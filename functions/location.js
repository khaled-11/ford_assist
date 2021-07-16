const mysql = require('mysql');
//const CryptoJS = require("crypto-js");
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
  var results;
  try{
    setInterval(function(){
        var cre_data; 
        var query = pool.query('select * from env_var;');
        query
        .on('result', async function(row) {
            cre_data = row
            console.log("Reading Env variables!")
        })
        .on('end', async function() {
            // var bytes  = CryptoJS.AES.decrypt(cre_data.accessToken, process.env.KEY);
            // var acToken = bytes.toString(CryptoJS.enc.Utf8); 
            var url = `https://api.mps.ford.com/api/fordconnect/vehicles/v1/${cre_data.vehicleId}/location`
            await axios.post(url,"", {
                headers: { 
                  "Content-Length":"0",
                  "Accept":"*/*",
                  "Accept-Encoding":"gzip, deflate, br",
                  "Connection":"keep-alive",
                  "Application-Id":cre_data.applicationId,
                  "Authorization": `Bearer ${cre_data.accessToken}`,
                  "api-version": cre_data.api_version
                }
            }).then(function(response) {
                console.log(response.data)
                var url = `https://api.mps.ford.com/api/fordconnect/vehicles/v1/${cre_data.vehicleId}/location`
                axios.get(url, {
                    headers: { 
                      "Content-Length":"0",
                      "Accept":"*/*",
                      "Accept-Encoding":"gzip, deflate, br",
                      "Connection":"keep-alive",
                      "Application-Id":cre_data.applicationId,
                      "Authorization": `Bearer ${acToken}`,
                      "api-version": cre_data.api_version
                    }
                }).then(async function(response) {
                    console.log(response.data)
                    var query = pool.query(`update location SET lon = "${response.data.vehicleLocation.longitude}", lat = "${response.data.vehicleLocation.latitude}", speed = "${response.data.vehicleLocation.speed}", direction = "${response.data.vehicleLocation.direction}";`);
                    query
                    .on('result', async function(row) {
                      console.log(row)
                    })
                    .on('end', async function() {
                      console.log("updated")
                    });
                }).catch(function(error){
                    console.log(error)
                });
            }).catch(function(error){
                console.log(error)
            });
            })
          }, 12000);

  }
  catch (e){
    return;
  }
  return results
};

