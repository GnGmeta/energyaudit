const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
var cheerio = require('cheerio');
const cheerioTableparser = require('cheerio-tableparser');
var moment = require('moment');
//var xl = require('excel4node');
const excel = require('node-excel-export');
var nodeXlsx = require('node-xlsx');
var fs = require('fs');

process.setMaxListeners(0);

router.get('/:fromdate/:todate', async function(req, res){

    var fromdate = moment(req.params.fromdate);
    var todate = moment(req.params.todate);

    var day = (moment.duration(todate.diff(fromdate)).asDays())+1;
    var ref = "";
    var arrayDay = [];
    console.log(day);
    for(var i = 0; i < day; i++){
        var today = "";
        if(i == 0) {
            today = req.params.fromdate;
            ref = today;
            arrayDay.push(today);
        }
        else{
            today = moment(ref).add("1","d").format("YYYY-MM-DD")+"";
            ref = today;
            arrayDay.push(today);
        }
        console.log(today);
        //await callBrowser(res, today);
    }
    console.log(arrayDay);
    await processArray(arrayDay);
    res.status(200).send('OK');
 });

async function processArray(array) {
    for(const item of array) {
        await callBrowser(item);
    }
}

//async function callBrowser(res, today) {
async function callBrowser(today) {

//var today = moment(req.params.fromdate).add("1","d").format("YYYY-MM-DD")+"";
//return new Promise((resolve) => {
    var date = today;
    var year = date.substring(0,4);
    var month = date.substring(5,7);
    var day = date.substring(8,10);
    var startTimestamp = year + "-" + month + "-" + day + " 00:00:00";
    var timestamp = moment(startTimestamp);

    const browser = await puppeteer.launch();
    //const page = await browser.newPage();
    puppeteer.launch({
        headless : false	// 헤드리스모드의 사용여부를 묻는다
        ,devtools : false	// 브라우저의 개발자 모드의 오픈 여부를 묻는다
        ,executablePath : puppeteer.executablePath()	// 실행할 chromium 기반의 브라우저의 실행 경로를 지정한다.
        ,ignoreDefaultArgs : false	// 배열이 주어진 경우 지정된 기본 인수를 필터링한다.(중요 : true사용금지)
        ,timeout : 30000	// 브라우저 인스턴스가 시작될 때까지 대기하는 시간(밀리 초)
        //,defaultViewport : { width : 800, height : 600 }	// 실행될 브라우저의 화면 크기를 지정한다.
        ,args : [ "about:blank" ]

    }).then(async browser => {

        const page = await browser.newPage();

        await page.goto( "https://pccs.kepco.co.kr/iSmart/", {waitUntil: 'networkidle0'});

        /**
         *  필수!!!! 계정 정보 입력
         */
        const ismartID = '0146238577';
        const ismartPW = 'sedc1212!';

        await delay(2000);

        const frame = (await (await page.frames () [0]. childFrames ()) [0]);

        await frame.evaluate((id, password) => {
            document.querySelector('#id').value = id;
            document.querySelector('#password').value = password;
        }, ismartID, ismartPW);

        await frame.click('.login_btn');
        await frame.waitForNavigation();
        await frame.goto('https://pccs.kepco.co.kr/iSmart/pccs/usage/getGlobalUsageStats.do');
        await delay(2000);

        //selection setting
        await frame.select('select[name="year"]', year+"");
        await frame.select('select[name="month"]', month+"");
        await frame.select('select[name="day"]', day+"");
        await frame.click('.btn_search');
        await frame.waitForNavigation();

        const content = await frame.content();
        $ = cheerio.load(content);
        var data = readTable( ".basic_table" );

        var row = 0;
        var resultdata = [];
        resultdata.push(['Day','Time','Total']);
        for(var i = 28;  i < data.length ; i++){
            //데이터가 아닌 컬럼은 건너뜀
            if(i == 28 || i == 29 || i == 78 || i == 79){

            }
            else {
                //TODO!! 디비에 저장 시간은 따로 가져오지 않고 15분 간격의 데이터를 제공하기에 moment를 사용하여 강제로 지정함.
                timestamp = moment(timestamp).add("15","m").format("YYYY-MM-DD HH:mm:00");
                //var unix = Math.floor(new Date(timestamp).getTime() / 1000);
                resultdata.push([timestamp, data[i][1], data[i][2]]); //엑셀에 저장할 데이터를 컬럼으로 항목 구분 후 행단위로 리스트에 저장
            }
        }
        // 3초간딜레이를 준다.
        await delay(1200);
        await browser.close();
        await delay(3000);
        // 모든 작업을 수행하면 브라우저를 닫고 퍼펫티어를 종료한다.
        var buffer = nodeXlsx.build([{name: "List User", data: resultdata}]);   //엑셀로 저장할 데이터를 담을 변수 생성
                fs.writeFile('excel/' + date + '.xlsx', buffer, function (err) { //엑셀로 파일 저장
                if(err){
                    //res.status(500).send('Something broke!');
                }else{
                    console.log('Filed saved');

                }
            });
        });
    //});
}

 // 테이블의 전체 셀을 읽음, table 태드를 읽어들여 2차원 배열 변수로 반환한다.
function readTable(query) {
     var data = [ ];
     var table = $( query );
     var tr_list = $( table ).children( "tbody" ).children( "tr" );

     // 행의 갯수만큼 반복문을 실행
     for( var row = 0; row < tr_list.length; row++ ) {
         var cells = tr_list.eq( row ).children( );
         var cols = [ ];
         // 열의 갯수만큼 반복문을 실행
         for( var column = 0; column < cells.length; column++ ) {
             var hero = cells.eq( column ).text( );
             cols.push( hero );
         }
         data.push( cols );
     }
     return data;

 }

function delay( timeout ) {
    return new Promise(( resolve ) => {
      setTimeout( resolve, timeout );
    });

}

module.exports = router;
