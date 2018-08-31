//twilio api setup
import {User} from './models.js';
import express from 'express';
const dialogflow = require('dialogflow');
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const app = express()
const twilioCli = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
//discord api setup
const Discord = require('discord.js');
const client = new Discord.Client();
const sessionClient = new dialogflow.SessionsClient();
mongoose.connect(process.env.MONGODB_URI);
var count=0;
client.on('ready', () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

// client.on('voiceStateUpdate', (oldMember, newMember) => {
//   let newUserChannel = newMember.voiceChannel
//   let oldUserChannel = oldMember.voiceChannel
//
//
//   if(oldUserChannel === undefined && newUserChannel !== undefined) {
//
//      // User Joins a voice channel
//
//   } else if(newUserChannel === undefined){
//
//     // User leaves a voice channel
//
//   }
// })

client.on('message', msg => {
  console.log('user id:', msg.member.user.id)
  console.log('channel id:', msg.channel.id)
  const sessionId = msg.member.user.id;
  const sessionPath = sessionClient.sessionPath(process.env.DIALOGFLOW_PROJECT_ID, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: msg.content,
        languageCode: 'en-US',
      },
    },
  };

  sessionClient.detectIntent(request)
    .then(responses => {
      //Get information about result
      console.log('full response:', responses)
      const result = responses[0].queryResult;
      console.log('result params from dialogflow:', result.parameters)
      console.log(`  Response: ${result.fulfillmentText}`);
      console.log('requireParams present:', result.allRequiredParamsPresent)
      console.log(`  Intent: ${result.intent.displayName}`);
      console.log(`querytext:${result.queryText.split(',')[0]}`)
      //check if user info is complete request
      if(!result.allRequiredParamsPresent){
        //requests user for more info
        console.log('require more user info:', result.fulfillmentText)
        msg.reply(result.fulfillmentText)
      }
      else if (result.intent.displayName === 'user.add') {
        console.log('running throw user.add...')
        User.findOne({userId:msg.member.user.id}, (err,user) => {
          if(user){
            console.log('there is a user:', user)
            msg.reply('we already have you on our system if you would like to update your phone number say: update number [YOUR PONE NUMBER HERE]');
          } else{
            console.log('phone:',result.parameters.fields.number-sequence.listValue)
            console.log('task :',result.parameters.fields.task.listValue)
            var newUser = new User({
            userId: msg.member.user.id,
            phone: result.parameters.fields.number.numberValue,
            channelId:msg.channel.id,
            });
            newUser.save(function(err){
              if (err) {console.log(error)}
              else {msg.reply(result.fulfillmentText)}
            });
          }
        })
      }
      else if (result.intent.displayName === 'send'){
        console.log('send throw user.send...')
        console.log('other user ids: ', result.parameters.fields['number-sequence'].listValue.values)
        console.log('other activity: ', result.parameters.fields.activity.listValue.values.map(val=>val.stringValue).join(' '))
        result.parameters.fields['number-sequence'].listValue.values.map((val)=>{
          User.findOne({userId: val.stringValue}, (err,user)=>{
            if(user){
              console.log(`phone :${user.phone}`)
              twilioCli.messages
                   .create({
                     body: result.fulfillmentText,
                     from: process.env.TWILIO_NUMBER,
                     to: user.phone
                   })
                   .then(message => console.log(message.sid))
                   .catch((message)=>console.log('something went wrong',message))
            } else {
              console.log(`value of id:`,val)
              msg.reply(`sorry i dont have <@${val}> in our system`)
            }
          })
        })
      }
      else if (result.intent.displayName === 'user.update'){
      console.log('send throw user.update...')
        User.findOneAndUpdate({userId: msg.member.user.id}, {phone:`whatsapp:+${result.parameters.fields.number.numberValue}`},(err,user)=>{
          if(result.queryText.split(',')[0]==='<@483745999748333579>'){
            console.log('safe')
          } else {
            msg.reply(`successfully changed your number into ${result.parameters.fields.number.numberValue}`)
          }
        })
      }
    })
    .catch(err => {
      console.log('error:', err)
    })
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post('/comein',(req,res) => {
    console.log('comein req:', req.body, req.query)
    User.findOne({phone:req.body.From},(err,user) => {
        client.channels.get(user.channelId).send('<@'+user.userId+'> said:'+req.body.Body)
      })
      // const sessionId = user.userId;
      // const sessionPath = sessionClient.sessionPath(process.env.DIALOGFLOW_PROJECT_ID, sessionId);
      // const request = {
      //   session: sessionPath,
      //   queryInput: {
      //     text: {
      //       text: req.body.Body,
      //       languageCode: 'en-US',
      //     },
      //   },
      // };
      // sessionClient.detectIntent(request)
      //   .then(responses => {
      //     client.channels.get(user.channelId).send('<@'+user.userId+'> said :'+req.body.Body);
      //     if(!result.allRequiredParamsPresent){
      //       //requests user for more info
      //       console.log('require more user info:', result.fulfillmentText)
      //       twilioCli.messages
      //            .create({
      //              body: result.fulfillmentText,
      //              from: process.env.TWILIO_NUMBER,
      //              to: user.phone
      //            })
      //            .then(message => console.log(message.sid))
      //            .catch((message)=>console.log('something went wrong',message))
      //       msg.reply(result.fulfillmentText)
      //     }
      //     else if (result.intent.displayName === 'answer') {
      //
      //     }
      //   })
    })
})

app.post('/callback',(req,res) => {
    console.log('callback req:', req.body, req.query)
})

client.login(process.env.DISCORD_TOKEN);
app.listen(3000)
// var Discord = require('discord.io');
// var logger = require('winston');
// // Configure logger settings
// logger.remove(logger.transports.Console);
// logger.add(new logger.transports.Console, {
//     colorize: true
// });
// logger.level = 'debug';
// // Initialize Discord Bot
// var bot = new Discord.Client({
//    token: process.env.DISCORD_TOKEN,
//    autorun: true
// });
// bot.on('ready', function (evt) {
//     logger.info('Connected');
//     logger.info('Logged in as: ');
//     logger.info(bot.username + ' - (' + bot.id + ')');
// });
// bot.on('message', function (user, userID, channelID, message, evt) {
//     // Our bot needs to know if it will execute a command
//     // It will listen for messages that will start with `!`
//     if (message.substring(0, 1) == '!') {
//         var args = message.substring(1).split(' ');
//         var cmd = args[0];
//
//         args = args.splice(1);
//         switch(cmd) {
//             // !ping
//             case 'ping':
//                 bot.sendMessage({
//                     to: channelID,
//                     message: 'Pong!'
//                 });
//             break;
//             // Just add any case commands if you want to..
//          }
//      }
// });
