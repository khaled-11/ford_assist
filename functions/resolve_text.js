const axios = require ("axios");

module.exports = async (text) => {
    const url = encodeURI(`https://api.wit.ai/message?v=20200513&q=${text}`);
    const OPTIONS = {
        headers: {
            Authorization: `Bearer ${process.env.WIT_TOKEN}`,
            ContentType: 'application/json'
        }
    }
    // Try the request after setting up the request_body.
    try{
        const response = await axios.get(url, OPTIONS);
        return response.data;
    }
    catch (e){
        return;
    }
};
