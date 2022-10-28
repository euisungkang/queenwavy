const Discord = require("discord.js");
const database = require("./firebaseSDK");

// Teams Channel ID: 1028295941188501525

async function initializeTeam(channel) {
  let msg = await updateTeam(channel);
}

let teamID = "1028301642019389521";

async function updateTeam(channel) {
  console.log("updating team");

  let info = await database.getTeam();

  let embed = await getEmbed();

  let exists = true;
  try {
    await channel.messages.fetch(teamID);
  } catch (error) {
    console.error(error);
    exists = false;
  } finally {
    if (!exists) {
      //Create New Raffle Message
      let msg = await channel.send({ embeds: embed });
      msg.react("<:HentaiCoin:814968693981184030>");
      rffID = msg.id;
      return msg;
    } else {
      //Fetch Existing Raffle Message
      const row = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder()
          .setCustomId("primary")
          .setLabel("Click me!")
          .setStyle(Discord.ButtonStyle.Primary)
      );
      let msg = await channel.messages.fetch(teamID);
      msg.edit({ embeds: [embed], components: [row] });
      return msg;
    }
  }
}

async function getEmbed() {
  let embed = new Discord.EmbedBuilder()
    .setColor("#ff6ad5")
    .setTitle("【 𝓦 𝓪 𝓿 𝔂 】  Team")
    .setThumbnail("https://i.ibb.co/5kL7hBD/Wavy-Logo.png")
    .setDescription("@everyone")
    .addFields(
      { name: "Name: ", value: "\u200B" },
      {
        name: "To purchase tickets, click the <:HentaiCoin:814968693981184030> below",
        value: "\u200B",
      }
    )
    .setFooter({
      text: "Sponsored by PronHub",
      iconURL:
        "https://steamuserimages-a.akamaihd.net/ugc/966474717666996844/124820F71D8D65A2986BE2DAEA1ADAFBC0308A23/",
    });

  return embed;
}

module.exports = {
  initializeTeam: initializeTeam,
};
