const Discord = require('discord.js');

const client = new Discord.Client();

 

client.on('ready', () => {

    console.log('I am ready!');

});

 

// client.on('message', message => {

//     if (message.content == '#ping') {
//        message.channel.send('pong');
//     }
//     else if (message.content == '#pong') {
//         message.channel.send('ping');
//     }
//     else if (message.content == '#introduce') {
//         message.channel.send('Wear a Mask, Stay Safe')
//     }

// });
 

// THIS  MUST  BE  THIS  WAY

client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret