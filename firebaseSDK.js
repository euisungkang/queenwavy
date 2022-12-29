const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(Buffer.from(process.env.DBAuth, "base64").toString("ascii"))
  ),
});

let db = admin.firestore();

async function addCurrency(m, amount) {
  let id = m.id;
  let name = m.username;

  console.log("ID: " + id + "    name:" + name + "    amount: " + amount);

  let user = db.collection("wallets").doc(id);
  let aggregate_amount = amount;
  let history = 0

  const doc = await user.get();
  if (doc.exists) {
    if (doc.data().name == "ALT ACCOUNT")
      return false

    aggregate_amount += doc.data().currency;
    history = doc.data().history + amount
    console.log(doc.data());
  }

  await user
    .update({
      userID: id,
      name: name,
      currency: aggregate_amount,
      history: history
    })
    .then(() => {
      console.log("Document written successfully");
    })
    .catch((err) => {
      console.log(err);
    });
  
  return true
}

async function setTimeJoined(m) {
  let time = new Date();

  console.log(
    "User: " + m.username + " of ID: " + m.id + " joined VC at " + time
  );

  let user = db.collection("wallets").doc(m.id);

  const doc = await user.get();
  if (!doc.exists) {
    await user
      .set({
        userID: m.id,
        name: m.username,
        currency: 0,
        cum: 0,
        history: 0,
        time: time,
      })
      .then(() => {
        console.log("Time Added Successfully. User first time");
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    await user
      .update({
        time: time,
      })
      .then(() => {
        console.log("Time Added Successfully");
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

async function getTimeJoined(m) {
  let time = new Date();

  console.log(
    "User: " + m.username + " of ID: " + m.id + " left a channel at " + time
  );

  let user = db.collection("wallets").doc(m.id);
  const doc = await user.get();
  if (doc.exists && doc.data().time != null) {
    time = doc.data().time.toDate();
  }

  await user
    .update({
      time: null,
    })
    .then(() => {
      console.log("Time Removed Successfully");
    })
    .catch((err) => {
      console.log(err);
    });

  return time;
}

async function removeCurrency(m, amount) {
  let id = m.id;
  let name = m.username;

  let user = db.collection("wallets").doc(id);
  let aggregate_amount;

  const doc = await user.get();
  //console.log(doc)
  if (doc.exists) {
    aggregate_amount = doc.data().currency - amount;
    console.log(doc.data());
  }

  await user
    .update({
      userID: id,
      name: name,
      currency: aggregate_amount,
    })
    .then(() => {
      console.log("Document written successfully");
    })
    .catch((err) => {
      console.log(err);
    });
}

async function updateAlts(alts) {
  let a = db.collection("meta").doc("users")
  const doc = await a.get()

  let newAlts = doc.data().alts
  if (doc.exists)
    for (const [key, value] of Object.entries(alts))
      newAlts[key] = value

  await a.update({
    alts: newAlts
  }).then(res => {
    console.log("[DATABASE] Document written successfully: Alt Accounts")
  }).catch(err => {
    console.log(err)
  })
}

async function purgeAlts() {
  let users = db.collection("meta").doc("users")
  const doc = await users.get()

  let alts = doc.data().alts

  if (!doc.exists)
    return

  let name = "ALT ACCOUNT";

  let user = db.collection("wallets")

  for (const [key, value] of Object.entries(alts)) {
    let alt = user.doc(value)

    await alt
      .set({
        userID: value,
        main: key,
        name: name,
        currency: 0,
        cum: 0,
        history: 0,
      })
      .catch((err) => {
        console.log(err);
      });
  }

  console.log("[DATABASE] Purged Alts")
}

async function getCurrency(id) {
  let user = db.collection("wallets").doc(id);

  const doc = await user.get();
  if (doc.exists) {
    return doc.data().currency;
  }

  return 0;
}

async function getCum(id) {
  let user = db.collection("wallets").doc(id);

  const doc = await user.get();
  if (doc.exists) {
    return doc.data().cum;
  }

  return 0;
}

async function getRaffle() {
  let raffleID = await (
    await db.collection("raffles").doc("metadata").get()
  ).data().raffle_id;
  let raffle = db.collection("raffles").doc(raffleID.toString());
  let doc = await raffle.get();

  return doc.data();
}

async function getTeam() {
  let team = db.collection("team").doc("queen");
  let doc = await team.get();

  return doc.data();
}

async function getRaffleName() {
  let raffle = await raffleID();
  let doc = await raffle.get();
  let data = doc.data();

  return data.name;
}

async function getTopWallets() {
  const wallets = await db.collection("wallets").get();
  let walletmap = new Map();

  wallets.docs.map((doc) => {
    walletmap.set(doc.data().userID, doc.data().currency);
  });

  const sorted = new Map([...walletmap.entries()].sort((a, b) => b[1] - a[1]));

  let index = 0;
  for (let k of sorted.keys()) {
    if (index > 4) {
      sorted.delete(k);
    }
    index++;
  }

  return sorted;
}

async function checkNotif(id) {
  const notif = db.collection("notification").doc(id);

  const doc = await notif.get();
  if (doc.exists) return false;
  else return true;
}

async function getAllTickets() {
  let raffle = await raffleID();
  let doc = await raffle.get();
  let data = doc.data();

  return data.all_tickets;
}

async function addAllTickets(id, amount) {
  let raffle = await raffleID();
  let doc = await raffle.get();
  let data = doc.data();
  let AT = data.all_tickets;

  for (let i = 0; i < amount; i++) {
    AT.push(id);
  }

  await raffle
    .update({
      all_tickets: AT,
    })
    .catch((err) => {
      console.log(err);
    });
}

async function getAllCandidates() {
  let raffle = await raffleID();
  let doc = await raffle.get();
  let data = doc.data();

  let candidates = Object.keys(data.tickets_per_user);

  return candidates;
}

async function getTicketsPurchased(id) {
  let raffle = await raffleID();
  let doc = await raffle.get();
  let data = doc.data();

  if (id in data.tickets_per_user) return data.tickets_per_user[id];
  else return 0;
}

async function addTicketsPurchased(id, amount) {
  let raffle = await raffleID();
  let doc = await raffle.get();
  let data = doc.data();

  let TPU = data.tickets_per_user;
  if (id in TPU) TPU[id] += amount;
  else TPU[id] = amount;

  await raffle
    .update({
      tickets_per_user: TPU,
    })
    .catch((err) => {
      console.log(err);
    });
}

async function disableReceipt(id) {
  const notif = db.collection("notification").doc(id);

  const doc = await notif.get();

  if (!doc.exists) {
    await notif
      .set({
        userID: id,
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

async function enableReceipt(id) {
  const notif = db.collection("notification").doc(id);

  const doc = await notif.get();
  if (doc.exists) {
    notif.delete();
  }
}

async function raffleID() {
  let raffleID = await (
    await db.collection("raffles").doc("metadata").get()
  ).data().raffle_id;
  let raffle = db.collection("raffles").doc(raffleID.toString());

  return raffle;
}

async function getWinner() {
  let raffle = await raffleID();
  let doc = await raffle.get();
  let data = doc.data();

  return data.winner;
}

async function setWinner() {
  let raffle = await raffleID();

  await raffle.update({
    winner: true,
  });
}

async function resetMonthlyCoins() {
  db.collection("wallets")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        data = doc.data();
        cum = data.currency + data.cum;

        doc.ref
          .update({
            cum: cum,
            currency: 0,
          })
          .catch((err) => {
            console.log(err);
          });
      });
    });
}

module.exports = {
  addCurrency: addCurrency,
  removeCurrency: removeCurrency,
  updateAlts: updateAlts,
  purgeAlts: purgeAlts,
  getCurrency: getCurrency,
  getCum: getCum,
  getRaffle: getRaffle,
  getTeam: getTeam,
  getWinner: getWinner,
  setWinner: setWinner,
  getTopWallets: getTopWallets,
  setTimeJoined: setTimeJoined,
  getTimeJoined: getTimeJoined,
  getAllTickets: getAllTickets,
  addAllTickets: addAllTickets,
  getRaffleName: getRaffleName,
  getAllCandidates: getAllCandidates,
  getTicketsPurchased: getTicketsPurchased,
  addTicketsPurchased: addTicketsPurchased,
  disableReceipt: disableReceipt,
  enableReceipt: enableReceipt,
  checkNotif: checkNotif,
  resetMonthlyCoins: resetMonthlyCoins,

};
