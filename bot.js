const Discord = require('discord.js');
const database = require('./firebaseSDK');
const raffle = require('./raffle.js')
const client = new Discord.Client();

client.on('ready', async () => {
    console.log('help');

    //Command channel
    let channel = await client.channels.fetch('794722902003941417')

    let raffle_channel = await client.channels.fetch('824718105989218349')

    // let status_msg = await raffle_channel.messages.fetch('824718440476311562')
    // status_msg.edit("__**Raffle Status: **__\n```diff\n- Offline\n```")


    initializeRaffle(raffle_channel)
});

let voiceStates = {};

client.login(process.env.BOT_TOKEN);
//client.login('ODEyOTA0ODY3NDYyNjQzNzEz.YDHipw._vJOWA08gbgJsunIuJlICGp99yw')

client.on('message', async message => {

    //Bot Central General: 813017396553449472
    //Wavy Bot Commands: 794722902003941417
    let channel = await client.channels.fetch('794722902003941417')

    if(message.content == '$raffle') {

        initializeRaffle(channel)

    } else if (message.content == '$wallet') {
        //console.log(message.author.id);
        database.getCurrency(message.author.id).then(res => {
            var today = new Date();

            var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
            //var time = today.getHours() + ":" + today.getMinutes();


            message.author.send("Date: " + date + ". You currently have " + res + " <:HentaiCoin:814968693981184030>");
        })
        message.delete();
    }
});

client.on('voiceStateUpdate', async (oldMember, newMember) => {
    let { id } = oldMember;

    let oldUserChannel = oldMember.channel;
    let newUserChannel = newMember.channel;

    // If user enters a channel for the first time
    if (oldUserChannel === null && newUserChannel != null && !(await isBot(id))) {

        // Category ID of arcade: 687839393444397111
        if (await channelIsValid(newUserChannel)) {
            voiceStates[id] = new Date();
            console.log('Joined Channel: ' + newMember.member.user.username)
        }

    // If user exits channels
    } else if (oldUserChannel != null && newUserChannel === null && !(await isBot(id))) {
        if (await channelIsValid(oldUserChannel)) {   
            calculateTimeSpent(oldMember, id)
        }

    // Moving between channels
    } else if (oldUserChannel != null && newUserChannel != null && !(await isBot(id))) {
        //console.log("moving")

        // Category ID of arcade: 687839393444397111

        // If moving from valid to non-valid channel
        if (await channelIsValid(oldUserChannel) && !(await channelIsValid(newUserChannel))) {
            calculateTimeSpent(oldMember, id);
        
        // If moving from non-valid to valid channel
        } else if (!(await channelIsValid(oldUserChannel)) && await channelIsValid(newUserChannel)) {
            voiceStates[id] = new Date();
            console.log('Joined Channel: ' + newMember.member.user.username)
        }
    
    }
});

async function isBot(id) {
    let user = await client.users.fetch(id)
    return user.bot
}

async function channelIsValid(channel) {
    // Arcade: 687839393444397111
    // Study: 809345799526809600
    // AFK: 814930846326456420

    let valid = await (channel.parentID == '687839393444397111' && channel.id != '809345799526809600' && channel.id != '814930846326456420');

    return valid
}

async function calculateTimeSpent(oldMember, id) {
     
    let now = new Date();
    let joined = voiceStates[id] || new Date();

    // getTime returns time in seconds
    let diff = (now.getTime() - joined.getTime()) / 1000;

    // Filter out users less than 5 minutes = 5 * 60
    if (diff > 5 * 60) {

        let amount = Math.round(diff / (5 * 60));
        await database.addCurrency(oldMember, amount);
    }
    console.log('Left Channel: ' + oldMember.member.user.username)

}

async function initializeRaffle(channel) {
    let msg = await raffle.updateRaffle(channel);

    msg.react('<:HentaiCoin:814968693981184030>');
    const filter = (reaction, user) => reaction.emoji.id == '814968693981184030' && user.id != msg.author.id
    raffle.awaitRaffleReaction(msg, channel, filter);
}
