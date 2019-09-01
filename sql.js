var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var types = require('tedious').TYPES;

var config =
{
    authentication: {
        options: {
            userName: 'intern_login', // update me
            password: 'helloBOT@007' // update me
        },
        type: 'default'
    },
    server: 'chatbot-intern-db.database.windows.net', // update me
    options:
    {
        database: 'Chatbot_Intern_DB', //update me
        encrypt: true
    }
}

var connection = new Connection(config);

connection.on('connect', function(err)
    {
        if (err)
        {
            console.log(err)
        }
        else
        {
            queryDatabase('6004211')
        }
    }
);

function queryDatabase(empId){
    var request = new Request(
        //'drop table empInfo',
        //'create table empInfo(eid varchar(30),ename varchar(30),cl int,sl int,el int)',
        //"insert into empInfo values('6004211','Ananya', 80 , 80 , 80 )",
        //"insert into empInfo values('6004311','Divya', 80 ,80 ,80)",
        //'select * from empInfo where eid = @Eid',
        //"update empInfo set cl = '80' where eid = @Eid",
        //'create table empLeaves(eid varchar(30),leavetype varchar(30),noofleaves int,token varchar(6))',
        'select * from empLeaves',
        function(err,rowCount){
            if(err){
                console.log(err);
            }
            else{
                console.log(rowCount);
            }
        }
    )
    request.addParameter('Eid',types.NVarChar,empId);
    request.on('row', function(columns) {
        var a={};
        columns.forEach(function(column) {
            console.log("%s\t%s", column.metadata.colName, column.value);
            a[column.metadata.colName]=column.value;
        });
        console.log(a);
    });
    connection.execSql(request);
}