var restify = require('restify');
var builder=require('botbuilder');
var leaveApply=require('./leaveApply');
var leaveBalance=require('./leaveBalance.js');
var leaveDelete=require('./leaveDelete.js');
var connection=require('tedious').Connection;
var types=require('tedious').TYPES;

var config= 
{
    authentication : {
        options: {
            userName: 'intern_login', 
            password: 'helloBOT@007' 
        },
        type : 'default'
    },
    server: 'chatbot-intern-db.database.windows.net',
    options: {
        database: 'Chatbot_Intern_DB', 
        encrypt: true
    }
}

function chkData(empId){
    var promise = new Promise (function (resolve,reject){
        var con = new connection(config);
        var Request=require('tedious').Request;
    
        con.on('connect', function(err)
            {
                if (err)
                {
                    console.log(err)
                }
                else
                {
                    db2()
                }
            }
        );
    
        function db2(){
            console.log("!!!!!!!!!!!!");
            var request=new Request(
                'select * from empInfo where eid = @Eid',
                function(err,rowCount){
                    if(err){
                        reject(err);
                        //console.log(err);
                    }
                    else{
                        console.log(rowCount," rows affected");
                        if(rowCount==0)
                        resolve(null);
                    }
                }
            )
            request.addParameter('Eid',types.NVarChar,empId);
            request.on('row', function(columns) {
                var a={}
                columns.forEach(function(column) {
                    console.log("%s\t%s", column.metadata.colName, column.value);
                    a[column.metadata.colName]=column.value;
                });
                resolve(a);
                //console.log(session.userData.empInfo);
            });
            con.execSql(request);
        }
    });
    return promise;
}

var server=restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978 ,() => {
    console.log(`${server.name} is listening to ${server.url}`)
});

var connector=new builder.ChatConnector({
    appId:process.env.MicrosoftAppId,
    appPassword:process.env.MicrosoftAppPassword
});

server.post('/api/messages',connector.listen());

var luisAppId = "29162f96-ca4d-4ff0-a2d6-0a36c15aa99e";
var luisAuth = "adc737d310c1412faca9c3a9c347ed94";
var endpoint = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/";

const luisUrl = endpoint + luisAppId + '?subscription-key=' + luisAuth;

var inMemoryStorage = new builder.MemoryBotStorage();
var bot=new builder.UniversalBot(connector,null,'main').set('storage',inMemoryStorage);
var recogniser = new builder.LuisRecognizer(luisUrl);

recogniser.onEnabled(
    function(session,callback){
        if(!session.conversationData.handle){
            callback(null,false);
        }
        else{
            callback(null,true);
        }
    }
)

bot.recognizer(recogniser);

bot.library(leaveApply.create());
bot.library(leaveBalance.create());
bot.library(leaveDelete.create());

//var lib=new builder.Library('main');
//exports.create = () => lib.clone();

bot.on('conversationUpdate',
    function(messages){
        bot.send(new builder.Message().address(messages.address).text("Welcome to HR Bot."));
    }
);

bot.dialog('/',[
    function(session,args){
        console.log("root dialog");
        session.conversationData.handle=false;
        if(args && args.reprompt){
            builder.Prompts.text(session,"No data found for given Id.Enter a proper Id: ");
        }
        else{
            builder.Prompts.text(session,"Enter your EmpId: ");
        }
    },
    function(session,results){
        chkData(results.response)
        .then(
            (a) => {
                session.conversationData.empInfo=a;
                console.log(session.conversationData.empInfo);
                if(session.conversationData.empInfo!=null){
                    session.conversationData.handle=true;
                    session.beginDialog('choice');
                }
                else{
                    session.replaceDialog('/',{reprompt:true});
                }
            }
        )
        .catch(
            (err) => {
                console.log(err);
                session.send("An error occured while fetching data")
            }
        );
    },
    function(session){
        session.endConversation("Thank You");
    }
]);

bot.dialog('choice',[
    function(session,args){ 
        if(args && args.reprompt){
            builder.Prompts.choice(session,'What else do you want to do?','Leave|Payroll',{listStyle:builder.ListStyle.button});
        }
        else{
            builder.Prompts.choice(session,'Your employee id is verified. What do you want to do?','Leave|Payroll',{listStyle:builder.ListStyle.button});
        }
    },
    function(session,results){
        if(results.response.entity=='Leave'){
            session.beginDialog('leave');
        }
        else{
            //session.beginDialog('payroll');
            console.log("payroll")
        }
    },
    function(session){
        session.endDialog();
    }
]);

bot.dialog('leave',[
    function(session){
        builder.Prompts.choice(session,'What do you want to do with leaves?','Apply Leave|Leave Balance|Delete Leave',{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        if(results.response.entity=='Apply Leave'){
            session.beginDialog('leaveApply:leaveType');
        }
        else if(results.response.entity=='Leave Balance'){
            session.beginDialog('leaveBalance:show');
        }
        else{
            session.beginDialog('leaveDelete:askToken');
        }
    },
    function(session,results){
        session.send(results.response);
        session.replaceDialog('choice',{reprompt:true}); 
    }
]).triggerAction({
    matches:/^leave$/i
});
