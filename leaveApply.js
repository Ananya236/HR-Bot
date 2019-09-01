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

function update(session,flag){
    return new Promise(
        function (resolve,reject){
            var con = new connection(config);
            var Request=require('tedious').Request;
        
            con.on('connect', function(err)
                {
                    if (err)
                    {
                        reject(err)
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
                    query='Update empInfo set '+ session.conversationData.leavecol +' = @NewDays where eid = @Id ';
                }
                else{
                    query='Insert into empLeaves values (@Id,@Leave,@Days,@Token)'
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
                request.addParameter('Id',types.NVarChar,session.conversationData.empInfo.eid);
                request.addParameter('NewDays',types.Int,session.conversationData.newDays);
                request.addParameter('Leave',types.NVarChar,session.conversationData.leavecol);
                request.addParameter('Token',types.NVarChar,session.conversationData.token);
                request.addParameter('Days',types.Int,session.conversationData.days);
                con.execSql(request);
            }
        }
    )
}

function chkDate(session,results){
    var day=new Date(results);
    var date=day.getDate();
    var month=day.getMonth()+1;
    var year=day.getFullYear();
    var curday=new Date();
    var curdate=curday.getDate();
    var curmonth=curday.getMonth()+1;
    var curyear=curday.getFullYear();
    console.log(`${date}    ${month}  ${year}`);
    console.log(`${curdate}   ${curmonth}  ${curyear}`);
    session.conversationData.start={
        date:date,
        month:month,
        year:year
    }
    if(year>curyear){
        if(session.conversationData.leave=='Sick Leave'){
            session.replaceDialog('leaveStart',{reprompt:true});
        }
        else{
            if(!session.conversationData.days){
                session.replaceDialog('days');
            }
            else{
                chkDays(session,session.conversationData.days);
            }
        }
    }
    else if(curyear==year){
        if(month>curmonth){
            if(session.conversationData.leave=="Sick Leave"){
                session.replaceDialog('leaveStart',{reprompt:true});
            }
            else{
                if(!session.conversationData.days){
                    session.replaceDialog('days');
                }
                else{
                    chkDays(session,session.conversationData.days);
                }
            }
        }
        else if(month==curmonth){
            if(date>curdate){
                if(session.conversationData.leave=="Sick Leave" && date > curdate+1){
                    session.replaceDialog('leaveStart',{reprompt:true});
                }
                else{
                    if(!session.conversationData.days){
                        session.replaceDialog('days');
                    }
                    else{
                        chkDays(session,session.conversationData.days);
                    }
                }
            }
            else if(date==curdate){
                if(!session.conversationData.days){
                    session.replaceDialog('days');
                }
                else{
                    chkDays(session,session.conversationData.days);
                }
            }
            else{
                session.replaceDialog('leaveStart',{reprompt:true});
            }
        }
        else{
            session.replaceDialog('leaveStart',{reprompt:true});
        }
    }
    else{
        session.replaceDialog('leaveStart',{reprompt:true});
    }
}

function chkDays(session,results){
    session.conversationData.days=results;
    session.conversationData.newDays=session.conversationData.prevDays-session.conversationData.days;
    console.log(session.conversationData.leavecol);
    console.log(session.conversationData.newDays);
    console.log(session.conversationData.empInfo.eid);
    session.conversationData.end={
        date:session.conversationData.start.date+session.conversationData.days,
        month:session.conversationData.start.month,
        year:session.conversationData.start.year
    }
    if(session.conversationData.days>2){
        if(session.conversationData.leave=="Sick Leave"){
            session.replaceDialog('days',{reprompt:true});
        }
        else{
            if(session.conversationData.days>3){
                if(session.conversationData.leave=="Earned Leave"){
                    session.replaceDialog('days',{reprompt:true});
                }
                else{
                    if(session.conversationData.days>5){
                        session.replaceDialog('days',{reprompt:true});
                    }
                    else{
                        session.replaceDialog('showInfo');
                    }
                }
            }
            else{
                session.replaceDialog('showInfo');
            }
        }
    }
    else{
        session.replaceDialog('showInfo');
    }
}

var bot=new builder.Library('leaveApply');
exports.create = () => bot.clone();
// bot.library(main.create());

bot.dialog('leaveType',[
    function(session,args){
        if(!args){
            builder.Prompts.choice(session,"Which type of leave do you want?","Casual Leave|Sick Leave|Earned Leave",{listStyle:builder.ListStyle.button});
        }
        else{
            var intent = args.intent;
            var leave = builder.EntityRecognizer.findEntity(intent.entities,'leaveType')
            console.log(leave);
            var start = builder.EntityRecognizer.findEntity(intent.entities,'builtin.datetimeV2.date')
            var days = builder.EntityRecognizer.findEntity(intent.entities,"builtin.number")
            if(days){
                session.conversationData.days = Number(days.entity);
            }
            if(!leave){
                builder.Prompts.choice(session,"Which type of leave do you want?","Casual Leave|Sick Leave|Earned Leave",{listStyle:builder.ListStyle.button});
            }
            else{
                if(leave.entity.match(/c[asual ]*l[eave]*/i)){  
                    session.conversationData.leave='Casual Leave';
                    session.conversationData.leavecol='cl';
                    session.conversationData.prevDays=session.conversationData.empInfo.cl;
                }
                else if(leave.entity.match(/s[ick ]*l[eave]*/i)){ 
                    session.conversationData.leave='Sick Leave';
                    session.conversationData.leavecol='sl';
                    session.conversationData.prevDays=session.conversationData.empInfo.sl;
                }
                else{ 
                    session.conversationData.leave='Earned Leave';
                    session.conversationData.leavecol='el';
                    session.conversationData.prevDays=session.conversationData.empInfo.el;
                }
                if(start){
                    session.conversationData.start = start.resolution.values[0].value;
                    chkDate(session,session.conversationData.start);
                }
                else{
                    session.replaceDialog('leaveStart');
                }
            }
        }        
    },
    function(session,results){
        session.conversationData.leave=results.response.entity;
        if(session.conversationData.leave=='Casual Leave'){
            session.conversationData.leavecol='cl';
            session.conversationData.prevDays=session.conversationData.empInfo.cl;
        }
        else if(session.conversationData.leave=='Sick Leave'){
            session.conversationData.leavecol='sl';
            session.conversationData.prevDays=session.conversationData.empInfo.sl;
        }
        else{
            session.conversationData.leavecol='el';
            session.conversationData.prevDays=session.conversationData.empInfo.el;
        }
        if(session.conversationData.start){
            chkDate(session,session.conversationData.start);
        }
        else{
            session.replaceDialog('leaveStart');
        }
    }
]).triggerAction({
    matches:[/^apply leave$/i]
});

bot.dialog('leaveStart',[
    function(session,args){
        if(args && args.reprompt){
            builder.Prompts.time(session,"Invalid!! Please enter a valid date. ")
        }
        else{
            builder.Prompts.time(session,"From which date do you want leave?[enter month/date/year]");
        }
    },
    function(session,results){
        console.log(results);
        chkDate(session,results.response.resolution.start);
    }
]);

bot.dialog('days',[
    function(session,args){
        if(args && args.reprompt){
            builder.Prompts.number(session,'This no of leaves are not permissible.Please enter a valid one.')
        }
        else{
            builder.Prompts.number(session,'For how long do you want leaves?');
        }
    },
    function(session,results){
        chkDays(session,results.response);
    }
]);

bot.dialog('showInfo',[
    function(session, arg, next){
        update(session,'$0')
        .then(()=>{
            console.log("database updated")
        })
        .catch((err)=>console.log(err));
        session.conversationData.token=Math.floor(Math.random()*90000) + 10000;
        update(session,'$1')
        .then(()=>{
            console.log("token generated");
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
                            text:session.conversationData.leave,
                            weight:"bolder"
                        },
                        {
                            type:"TextBlock",
                            text:`Start date: ${session.conversationData.start.date} - ${session.conversationData.start.month} - ${session.conversationData.start.year}`
                        },
                        {
                            type:"TextBlock",
                            text:`End date: ${session.conversationData.end.date} - ${session.conversationData.end.month} - ${session.conversationData.end.year}`
                        },
                        {
                            type:"TextBlock",
                            text:`No of days: ${session.conversationData.days}`
                        },
                        {
                            type:"TextBlock",
                            text:`Token No: ${session.conversationData.token}`
                        }
                    ]
                }
            });
            session.send(msg);
            next();
        })
        .catch(()=>console.log(err));
    },
    function(session){ 
        session.send("You successfully applied for leave.")
        session.replaceDialog('main:choice',{reprompt:true});
    }
]);