const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('I am ready!');
});

//let channel = process.env.CHANNELID;

client.login(process.env.BOT_TOKEN);

client.on('message', message => {

    //Bot Central General: 813017396553449472
    let channel = client.channels.find(channel => channel.id === '813017396553449472')

    if (message.content == '#ping') {
       channel.send('pong');
    }
    else if (message.content == '#pong') {
        channel.send('ping');
    }
    else if (message.content == '#introduce') {
        channel.send('Wht')
    }

});

client.on('voiceStateUpdate', (oldMember, newMember) => {
    //console.log("something happened");

    let oldUserChannel = oldMember.voiceChannel;
    let newUserChannel = newMember.voiceChannel;

    if (oldUserChannel === undefined && newUserChannel !== undefined) {
        console.log('Joined Channel: ' + newMember.nickname)

    } else if (newUserChannel === undefined) {
        console.log('Left Channel: ' + newMember.nickname)
    }
});