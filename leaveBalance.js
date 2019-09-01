var builder=require('botbuilder');
var bot=new builder.Library('leaveBalance');
exports.create=()=>bot.clone();
bot.dialog('show',[
    function(session,arg,next){
        var msg=new builder.Message(session);
        msg.addAttachment({
            contentType:"application/vnd.microsoft.card.adaptive",
            content:{
                type:"AdaptiveCard",
                body:[
                    {
                        type:"TextBlock",
                        text:`Employee Id : ${session.conversationData.empInfo.eid}`,
                        weight:"bolder"
                    },
                    {
                        type:"TextBlock",
                        text:`Employee Name : ${session.conversationData.empInfo.ename}`,
                        weight:"bolder"
                    },
                    {
                        type:"TextBlock",
                        text:`Casual Leave : ${session.conversationData.empInfo.cl}`,
                        weight:"bolder"
                    },
                    {
                        type:"TextBlock",
                        text:`Sick Leave : ${session.conversationData.empInfo.sl}`,
                        weight:"bolder"
                    },
                    {
                        type:"TextBlock",
                        text:`Earned Leave : ${session.conversationData.empInfo.el}`,
                        weight:"bolder"
                    }
                ]
            }
        })
        session.send(msg);
        next();
    },
    function(session){
        session.send("These are your leave balances.");
        session.replaceDialog('main:choice',{reprompt:true});
    }
]).triggerAction({
    matches:['leaveBalances',/^leave[ ]*Balance$/i]
});