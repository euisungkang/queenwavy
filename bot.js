const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('I am ready!');
});

//let channel = process.env.CHANNELID;

client.on('message', message => {

    let channel = client.channels.find(channel => channel.id === '813017396553449472')

    if (message.content == '#ping') {
       channel.send('pong');
    }
    else if (message.content == '#pong') {
        channel.send('ping');
    }
    else if (message.content == '#introduce') {
        channel.send('Sup Bitch')
    }

});

client.login(process.env.BOT_TOKEN);