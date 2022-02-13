const database = require('./firebaseSDK');
const Discord = require('discord.js')

let rffID = '824718557446144081';

async function updateRaffle(channel) {
    console.log("updating raffle")

    let r = await database.getRaffle();

    let embed = await getEmbed(r);

    let exists = true;
    try {
        await channel.messages.fetch(rffID)
    } catch (error) {
        console.error(error)
        exists = false;
    } finally {
        if (!exists) {

            //Create New Raffle Message
            let msg = await channel.send(embed)
            msg.react('<:HentaiCoin:814968693981184030>')
            rffID = msg.id
            return msg;

        } else {

            //Fetch Existing Raffle Message
            let msg = await channel.messages.fetch(rffID)        
            msg.edit(embed);
            return msg;
        }
    }
}

async function startRaffleTimer(msg) {
    let r = await database.getRaffle();
    let timeLeft = getRawTime(r);

    embed = msg.embeds[0]

    interval = setInterval(() => {
        timeLeft -= 2000;
        embed.fields.forEach(field => {

            if (field.name == "Countdown Until Raffle Draw")
                field.value = "```fix\n" + timeFormat(timeLeft) + "\n```"
        })

        if (timeLeft <= 0) {
            pickWinner()
            return
        }

        msg.edit(embed)
    }, 2000)
}

async function getEmbed(r) {

    time = await calculateTimer(r);

    let embed = await new Discord.MessageEmbed()
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Raffle")
    .setThumbnail('https://i.ibb.co/5kL7hBD/Wavy-Logo.png')
    .setDescription("@everyone A new raffle for **" + r.name + "** is now open! You are free to spend your Hentai Coins <:HentaiCoin:814968693981184030> to buy tickets." 
                        + "\n```"+ r.description + "```")
    .addFields(
        { name: "Cost per Ticket:  " + r.cost_per_ticket, value: '\u200B' },
        { name: "Max Tickets per Person:  " + r.max_tickets, value: '\u200B' },
        { name: "To purchase tickets, click the <:HentaiCoin:814968693981184030> below", value: '\u200B' },
        { name: "Countdown Until Raffle Draw", value: "```fix\n" + time + "\n```" }
    )
    .setFooter("Sponsored by PornHub", 'https://steamuserimages-a.akamaihd.net/ugc/966474717666996844/124820F71D8D65A2986BE2DAEA1ADAFBC0308A23/')

    return embed;
}

// Await reactions on raffle messages, recursive
async function awaitRaffleReaction(message, channel, filter) {
    console.log("awaiting reaction")
    let user;

    await message.awaitReactions(filter, { max: 1 })
    .then(async collected => {
        user = collected.first().users.cache.last()
        await message.reactions.cache.find(r => r.emoji.id == '814968693981184030').users.remove(user)
    })
    .catch(err => console.log(err))

    await ticketPurchase(user, channel).catch(err => console.log(err))

    awaitRaffleReaction(message, channel, filter)
}

async function ticketPurchase(user, channel) {
    let raffle = await database.getRaffle();
    let tickets = raffle.tickets_per_user
    let available = raffle.max_tickets

    // If user already bought max tickets
    if (tickets.includes(user.id) && tickets[user.id] >= raffle.max_tickets) {
        await channel.send("You already purchased the max number of tickets")
        .then(async message => {
            const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
            await wait(5000);
            await message.delete()
        })

    // If user already bought tickets, but isn't maxed
    } else if (tickets.includes(user.id) && tickets[user.id] < raffle.max_tickets) {
        available -= tickets[user.id]
    }

    await channel.send("<@" + user.id + "> You can purchase " + available + " tickets. How many tickets would you like to purchase? Your balance is: **"
                + await database.getCurrency(user.id)
                + "** <:HentaiCoin:814968693981184030>.\n You can type 'all' to purchase as many tickets as you can afford.")
    .then(async message => {
        let filter = (m) => m.author.id == user.id;

        // How many tickets does user want to buy?
        await channel.awaitMessages(filter, { max: 1, time: 30000, errors: ['time'] })
        .then(async collected => {
            console.log(user.id + "     " + collected.first().content + "      " + await database.getCurrency(user.id))

            // Handles valid input and currency charge
            let response = await calculateCurrency(raffle, channel, collected, user);

            const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
            await wait(5000);

            // Delete all user messages
            await channel.messages.fetch(collected.first().id)
            .then(m => m.delete())
            .catch(err => console.log(err))

            await collected.delete()

            await response.delete()
        })
        .catch(err => console.log(err))
        await message.delete()
    })
    .catch(err => console.log(err))
}

async function calculateCurrency(raffle, channel, message, user) {
    let wallet = await database.getCurrency(user.id);

    // If input is not a valid number
    if(isNaN(message.first().content) && message.first().content != 'all') {
        return await channel.send("Please enter a valid number <:PogO:804089420020973568>")
        .then(message => {return message})

    // If input is 0
    } else if (parseInt(message.first().content) == 0) {
        return await channel.send("If you're gonna buy 0 tickets, don't waste my time")
        .then(message => {return message})

    // If user doesn't have enough money to buy at least 1 ticket
    } else if (wallet < raffle.cost_per_ticket) {
        return await channel.send("You don't have enough <:HentaiCoin:814968693981184030>. Broke ass bitch")
        .then(message => {return message})
    }

    // If user enters 'all'
    let remaining;
    let max = Math.min(raffle.max_tickets, Math.trunc(wallet/raffle.cost_per_ticket));
    if (message.first().content == "all") {
        remaining = wallet - (max * raffle.cost_per_ticket);

        //database.removeCurrency(user, max * raffle.cost_per_ticket)

        return await channel.send("You purchased a total of " + max + " tickets. Your remaining balance is: " + remaining + " <:HentaiCoin:814968693981184030>")
        .then(message => {return message})
    }
    
    // If user enters a valid number
    let amount = Math.trunc(parseInt(message.first().content));
    if (amount > max) {
        return await channel.send("You don't have enough <:HentaiCoin:814968693981184030>. Broke ass bitch")
        .then(message => {return message})
    } else {
        remaining = wallet - (amount * raffle.cost_per_ticket);

        //database.removeCurrency(user, amount * raffle.cost_per_ticket)

        return await channel.send("You purchased a total of " + amount + " tickets. Your remaining balance is: " + remaining + " <:HentaiCoin:814968693981184030>")
        .then(message => {return message})
    }
}

async function pickWinner() {
    
}

function getRawTime(r) {
    // Get End Date + Time
    var countDownDate = r.CD.toDate().getTime()

    var now = new Date().getTime();
    var timeleft = countDownDate - now;
    return timeleft
}

function calculateTimer(r) {
    // Get End Date + Time
    var countDownDate = r.CD.toDate().getTime()

    var now = new Date().getTime();
    var timeleft = countDownDate - now;

    return timeFormat(timeleft)
}

function timeFormat(t) {
    var d = Math.floor(t / (1000 * 60 * 60 * 24));
    var h = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var m = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
    var s = Math.floor((t % (1000 * 60)) / 1000);

    return d.toString() + " days   " + ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2)
}

module.exports = {
    awaitRaffleReaction : awaitRaffleReaction,
    updateRaffle : updateRaffle,
    startRaffleTimer: startRaffleTimer,
    pickWinner : pickWinner
}