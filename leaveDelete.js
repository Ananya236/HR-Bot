var builder=require('botbuilder');
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

function db(session,flag){
    return new Promise(function (resolve,reject){
        var con = new connection(config);
        var Request=require('tedious').Request;
    
        con.on('connect', function(err)
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    db2()
                }
            }
        );
    
        function db2(){
            var query;
            if(flag=='$0'){
                query='Update empInfo set '+ session.conversationData.tokenInfo.leavetype +' = @Days where eid = @Id';
            }
            else{
                query='Delete from empLeaves where token = @Token'
            }
            var request=new Request(
                query,
                function(err,rowCount){
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log(rowCount," rows affected");
                        resolve();
                    }
                }
            )
            request.addParameter('Id',types.NVarChar,session.conversationData.tokenInfo.eid);
            request.addParameter('Days',types.Int,session.conversationData.newDaysto);
            request.addParameter('Token',types.NVarChar,session.conversationData.tokenInfo.token);
            con.execSql(request);
        }
    });
}

function chkToken(token){
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
                'select * from empLeaves where token = @Token',
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
            request.addParameter('Token',types.NVarChar,token);
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

var bot=new builder.Library('leaveDelete');
exports.create = () => bot.clone();

bot.dialog('askToken',[
    function(session,args){
        if(args && args.reprompt){
            builder.Prompts.number(session,"No data found for given token.Please enter a correct one.")
        }
        else{
            builder.Prompts.number(session,"Enter token number for leaves you want to delete:");
        }
    },
    function(session,results){
        chkToken(results.response)
        .then(
            (a) => {
                session.conversationData.tokenInfo=a;
                console.log(session.conversationData.tokenInfo);
                if(session.conversationData.tokenInfo!=null){
                    if(session.conversationData.tokenInfo.leavetype=='cl'){
                        session.conversationData.newDaysto=session.conversationData.empInfo.cl+session.conversationData.tokenInfo.noofleaves;
                    }
                    else if(session.conversationData.tokenInfo.leavetype=='el'){
                        session.conversationData.newDaysto=session.conversationData.empInfo.el+session.conversationData.tokenInfo.noofleaves;
                    }
                    else{
                        session.conversationData.newDaysto=session.conversationData.empInfo.sl+session.conversationData.tokenInfo.noofleaves;
                    }
                    session.beginDialog('showData');
                }
                else{
                    session.replaceDialog('askToken',{reprompt:true});
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
        session.endDialog();
    }
]).triggerAction({
    matches:['deleteLeave',/^delete leave$/i]
});

bot.dialog('showData',[
    function(session){
        var msg=new builder.Message(session);
        msg.addAttachment({
            contentType:"application/vnd.microsoft.card.adaptive",
            content:{
                type:"AdaptiveCard",
                body:[
                    {
                        type:"TextBlock",
                        text:session.conversationData.empInfo.ename,
                        size:"large",
                        weight:"bolder"
                    },
                    {
                        type:"TextBlock",
                        text:`Employee ID: ${session.conversationData.tokenInfo.eid}`,
                        weight:"bolder"
                    },
                    {
                        type:"TextBlock",
                        text:`Leave Type: ${session.conversationData.tokenInfo.leavetype}`
                    },
                    {
                        type:"TextBlock",
                        text:`No of days: ${session.conversationData.tokenInfo.noofleaves}`
                    },
                    {
                        type:"TextBlock",
                        text:`Token No: ${session.conversationData.tokenInfo.token}`
                    }
                ]
            }
        });
        session.send(msg);
        session.beginDialog('delete');
    },
    function(session){
        session.endDialog();
    }
]);

bot.dialog('delete',[
    function(session){
        builder.Prompts.choice(session,"Do you want to delete these leaves?","Yes|No",{listStyle:builder.ListStyle.button});
    },
    function(session,results,next){
        if(results.response.entity=="Yes"){
            db(session,'$0')
            .then(()=>{
                console.log("database updated");
            })
            .catch((err)=>console.log(err));
            db(session,'$1')
            .then(()=>{
                console.log("token deleted");
                session.send("Your leaves are deleted successfully.");
                next();
            })
            .catch((err)=>console.log(err));
        }
        else{
            session.send("Leaves not deleted.")
            next();
        }
    },
    function(session){
        session.replaceDialog('main:choice',{reprompt:true});
    }
]);