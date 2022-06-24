const makeWaSocket = require('@adiwajshing/baileys').default;
const { delay, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');
const P = require('pino');
const {  existsSync, mkdirSync, readFileSync, chownSync, rm } = require('fs');
const express = require('express');
const { body, validationResult } = require('express-validator');
const http = require('http');
const { url } = require('inspector');
const { text } = require('express');
const port = process.env.PORT || 8080 ;
const app = express();
const server = http.createServer(app);
const ZDGPath = './ZDGSessions/';
const ZDGAuth = 'auth_info.json';

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

const ZDGUpdate = (ZDGsock) => {
   ZDGsock.on('connection.update', ({ connection, lastDisconnect, qr }) => {

      // bloco 1
      if (qr){
         console.log('© BOT-ZDG - Qrcode: ', qr);
      };
      // bloco 2
      if (connection === 'close') {
         const ZDGReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
         if (ZDGReconnect) ZDGConnection()
         console.log(`© BOT-ZDG - CONEXÃO FECHADA! RAZÃO: ` + DisconnectReason.loggedOut.toString());
         // condicao para remover o arquivo de autenticação
         if (ZDGReconnect === false) {
            const removeAuth = ZDGPath // + ZDGAuth
            rm(removeAuth, {recursive: true},  err => {
               if (err) throw err
            })
         }
      }
      // bloco 3
      if (connection === 'open'){
         console.log('© BOT-ZDG -CONECTADO')
      }
   })
}

const ZDGConnection = async () => {
   const { version } = await fetchLatestBaileysVersion()
// se a pasta de sessoes não existir, ele cria   
   if (!existsSync(ZDGPath)) {
// recursive: Indicates whether parent folders should be created. If a folder was created, the path to the first created folder will be returned.
      mkdirSync(ZDGPath, { recursive: true });
   }
   //                   analisar essa função com o leo 
   const { saveCreds, state } = await useMultiFileAuthState('./ZDGSessions')
   // console.log(saveCreds)
   // console.log(state)
   const config = {
      auth: state,
      logger: P({ level: 'error' }),
      printQRInTerminal: true,
      version,
      connectTimeoutMs: 60_000,
      async getMessage(key) {
         return { conversation: 'botzg' };
      },
   }
   console.log(config.auth.creds.me)
   // analisar com leo
   const ZDGsock = makeWaSocket(config);
   // console.log(ZDGsock)
   // função onde sera definido que ira acontecer quando o script rodar
   ZDGUpdate(ZDGsock.ev);
  // função aparentemente usada para salvar a autenticação 
   ZDGsock.ev.on('creds.update', saveCreds);

   const ZDGSendMessage = async (jid, templateMessage) => {
      await ZDGsock.presenceSubscribe(jid)
      await delay(2000)
      await ZDGsock.sendPresenceUpdate('composing', jid)
      await delay(1500)
      await ZDGsock.sendPresenceUpdate('paused', jid)

   
      return await ZDGsock.sendMessage(jid, templateMessage)
   }

   // Send message
   app.post('/whatsapp-message', [
      body('jid').notEmpty(),
      body('message').notEmpty(),
   ], async (req, res) => {
      const errors = validationResult(req).formatWith(({
      msg
      }) => {
      return msg;
      });
      if (!errors.isEmpty()) {
      return res.status(422).json({
         status: false,
         message: errors.mapped()
      });
      }
      const jid = req.body.jid;
      const numberDDI = jid.substr(0, 2);
      const numberDDD = jid.substr(2, 2);
      const numberUser = jid.substr(-8, 8);
      const message = req.body.message;
      
      const textMessage = {
         text: message,
     }
    
      if (numberDDI !== '55') {
        await ZDGSendMessage(jid, textMessage).then(response => {
            res.status(200).json({
               status: true,
               response: response
            });
            }).catch(err => {
            res.status(500).json({
               status: false,
               response: err
            });
            });
      }
      if (numberDDI === '55' && numberDDD <= 30) {
         const numberZDG = "55" + numberDDD + "9" + numberUser + "@s.whatsapp.net";
        await ZDGSendMessage(numberZDG, textMessage).then(response => {
            res.status(200).json({
               status: true,
               response: response
            });
            }).catch(err => {
            res.status(500).json({
               status: false,
               response: err
            });
            });
      }
      if (numberDDI === '55' && numberDDD > 30) {
         const numberZDG = "55" + numberDDD + numberUser + "@s.whatsapp.net";
       await  ZDGSendMessage(numberZDG, textMessage).then(response => {
            res.status(200).json({
               status: true,
               response: response
            });
            }).catch(err => {
            res.status(500).json({
               status: false,
               response: err
            });
            });
      }

   });

   app.post('/whatsapp-imagewithmessage', [
    body('jid').notEmpty(),
    body('message').notEmpty(),
    body('image').notEmpty(),
 ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
    msg
    }) => {
    return msg;
    });
    if (!errors.isEmpty()) {
    return res.status(422).json({
       status: false,
       message: errors.mapped()
    });
    }
    const jid = req.body.jid;
    const numberDDI = jid.substr(0, 2);
    const numberDDD = jid.substr(2, 2);
    const numberUser = jid.substr(-8, 8);
    const message = req.body.message;
    const img = req.body.image
    
    const imageMessage = {
        image:{url: `${img}`},
        caption: message,
   }
  
    if (numberDDI !== '55') {
      await ZDGSendMessage(jid, imageMessage).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD <= 30) {
       const numberZDG = "55" + numberDDD + "9" + numberUser + "@s.whatsapp.net";
      await ZDGSendMessage(numberZDG, imageMessage).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD > 30) {
       const numberZDG = "55" + numberDDD + numberUser + "@s.whatsapp.net";
     await  ZDGSendMessage(numberZDG, imageMessage).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }

   });

   app.post('/whatsapp-image', [
    body('jid').notEmpty(),
    body('image').notEmpty(),
 ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
    msg
    }) => {
    return msg;
    });
    if (!errors.isEmpty()) {
    return res.status(422).json({
       status: false,
       message: errors.mapped()
    });
    }
    const jid = req.body.jid;
    const numberDDI = jid.substr(0, 2);
    const numberDDD = jid.substr(2, 2);
    const numberUser = jid.substr(-8, 8);
    const img = req.body.image
    
    const image = {
        image:{url: `${img}`},
   }
  
    if (numberDDI !== '55') {
      await ZDGSendMessage(jid, image).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD <= 30) {
       const numberZDG = "55" + numberDDD + "9" + numberUser + "@s.whatsapp.net";
      await ZDGSendMessage(numberZDG, image).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD > 30) {
       const numberZDG = "55" + numberDDD + numberUser + "@s.whatsapp.net";
     await  ZDGSendMessage(numberZDG, image).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }

   });

   app.post('/whatsapp-buttonmessage', [
    body('jid').notEmpty(),
    body('message').notEmpty(),
    body('footer').notEmpty(),
    body('img').notEmpty(),
    body('id1').notEmpty(),
    body('id2').notEmpty(),
    body('id3').notEmpty(),
    body('displaytext1').notEmpty(),
    body('displaytext2').notEmpty(),
    body('displaytext3').notEmpty(),
 ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
    msg
    }) => {
    return msg;
    });
    if (!errors.isEmpty()) {
    return res.status(422).json({
       status: false,
       message: errors.mapped()
    });
    }
    const jid = req.body.jid;
    const numberDDI = jid.substr(0, 2);
    const numberDDD = jid.substr(2, 2);
    const numberUser = jid.substr(-8, 8);
    const message = req.body.message;
    const img = req.body.img
    const footer = req.body.footer;
    const id1 = req.body.id1;
    const id2 = req.body.id2;
    const id3 = req.body.id3;
    const displayText1 = req.body.displaytext1;
    const displayText2 = req.body.displaytext2;
    const displayText3 = req.body.displaytext3;
    
    const buttons = [
        { buttonId: id1, buttonText: { displayText: displayText1 }, type: 1 },
        { buttonId: id2, buttonText: { displayText: displayText2 }, type: 1 },
        { buttonId: id3, buttonText: { displayText: displayText3 }, type: 1 },
     ]

   const templateMessageButton = {
        image:{url: `${img}`},
        caption: message,
        footer: footer,
        buttons: buttons,
        headerType: 4,
     }

  
    if (numberDDI !== '55') {
      await ZDGSendMessage(jid, templateMessageButton).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD <= 30) {
       const numberZDG = "55" + numberDDD + "9" + numberUser + "@s.whatsapp.net";
      await ZDGSendMessage(numberZDG, templateMessageButton).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD > 30) {
       const numberZDG = "55" + numberDDD + numberUser + "@s.whatsapp.net";
     await  ZDGSendMessage(numberZDG, templateMessageButton).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }

   });

   app.post('/whatsapp-buttonlink', [
    body('jid').notEmpty(),
    body('message').notEmpty(),
    body('footer').notEmpty(),
    body('img').notEmpty(),
    body('link').notEmpty(),
    body('messagelink').notEmpty(),
    body('displaycalltext').notEmpty(),
 ], async (req, res) => {
    const errors = validationResult(req).formatWith(({
    msg
    }) => {
    return msg;
    });
    if (!errors.isEmpty()) {
    return res.status(422).json({
       status: false,
       message: errors.mapped()
    });
    }
    const jid = req.body.jid
    const numberDDI = jid.substr(0, 2)
    const numberDDD = jid.substr(2, 2)
    const numberUser = jid.substr(-8, 8)
    const message = req.body.message
    const img = req.body.img
    const footer = req.body.footer
    const displayTextCall = req.body.displaycalltext
    const link = req.body.link
    const messageLink = req.body.messagelink
    const numberToCall = jid


    const templateButtons = [
        {index: 1, urlButton: {displayText: messageLink, url: link}},
        {index: 2, callButton: {displayText: displayTextCall, phoneNumber: numberToCall}},
      ]
      const templateMessageLink = {
        image:{url: `${img}`},
        caption: message,
        footer: footer,
        templateButtons: templateButtons,
        headerType: 4,
     }

    if (numberDDI !== '55') {
      await ZDGSendMessage(jid, templateMessageLink).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD <= 30) {
       const numberZDG = "55" + numberDDD + "9" + numberUser + "@s.whatsapp.net";
      await ZDGSendMessage(numberZDG, templateMessageLink).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }
    if (numberDDI === '55' && numberDDD > 30) {
       const numberZDG = "55" + numberDDD + numberUser + "@s.whatsapp.net";
     await  ZDGSendMessage(numberZDG, templateMessageLink).then(response => {
          res.status(200).json({
             status: true,
             response: response
          });
          }).catch(err => {
          res.status(500).json({
             status: false,
             response: err
          });
          });
    }

   });

   

}

ZDGConnection()

server.listen(port, function() {
   console.log('© BOT-TRATO - Servidor rodando na porta: ' + port);
 });