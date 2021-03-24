const Discord = require('discord.js');
const database = require('./firebaseSDK');
const raffle = require('./raffle.js')
const client = new Discord.Client();

client.on('ready', () => {
    console.log('help');
});

let voiceStates = {};

client.login(process.env.BOT_TOKEN);
//client.login('')

client.on('message', async message => {

    //Bot Central General: 813017396553449472
    //Wavy Bot Commands: 794722902003941417
    let channel = client.channels.cache.find(channel => channel.id === '794722902003941417')

    if(message.content == '$raffle') {
        let r = await database.getRaffle();
        channel.send("@everyone A new raffle for **" + r.name + "** is now open! You are free to spend your Hentai Coins <:HentaiCoin:814968693981184030> to buy tickets." 
                    + "\n> ```"+ r.description + "```"
                    + "\n> **Cost per Ticket: **" + r.cost_per_ticket
                    + "\n> **Max Tickets per Person: **" + r.max_tickets
                    + "\n> \n> To purchase tickets, click the <:HentaiCoin:814968693981184030> below!"
                    + "\n> "
                    + "\n> __**Countdown Until Raffle Draw**__"
                    + "\n```fix\n hi\n```"
                    + "\n")
        .then(thenEmbed => {

            thenEmbed.react('<:HentaiCoin:814968693981184030>');
            const filter = (reaction, user) => reaction.emoji.id == '814968693981184030' && user.id != thenEmbed.author.id
            raffle.awaitRaffleReaction(thenEmbed, channel, filter);

        })
    } else if (message.content == '$wallet') {
        //console.log(message.author.id);
        database.getCurrency(message.author.id).then(res => {
            var today = new Date();

            var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
            var time = today.getHours() + ":" + today.getMinutes();


            message.author.send("Time: " + date + ", " + time + ". You currently have " + res + " <:HentaiCoin:814968693981184030>");
        })
        message.delete();
    }
});

client.on('voiceStateUpdate', async (oldMember, newMember) => {
    let { id } = oldMember;

    let oldUserChannel = oldMember.channel;
    let newUserChannel = newMember.channel;


    // If user enters a channel for the first time
    if (oldUserChannel === null && newUserChannel != null) {

        // Category ID of arcade: 687839393444397111
        if (await channelIsValid(newUserChannel)) {
            voiceStates[id] = new Date();
            console.log('Joined Channel: ' + newMember.member.user.username)
        }

    // If user exits channels
    } else if (oldUserChannel != null && newUserChannel === null) {
        if (await channelIsValid(oldUserChannel)) {   
            calculateTimeSpent(oldMember, id)
        }

    // Moving between channels
    } else if (oldUserChannel != null && newUserChannel != null) {
        console.log("moving")

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
    if (diff > 5) {

        let amount = Math.round(diff / (5));
        await database.addCurrency(oldMember, amount);
    }
    console.log('Left Channel: ' + oldMember.member.user.username)

}
