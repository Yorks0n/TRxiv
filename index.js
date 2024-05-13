const json2csv = require('json2csv').parse;
const fs = require('fs');
const axios = require('axios');

function getAltUrls(timeframe = ['1d'], pageList = [1]){
    let urls = [];
    timeframe.forEach(tf => {
        pageList.forEach(page => {
            //console.log("https://api.altmetric.com/v1/citations/" + tf + "?num_results=100&page=" + page + "&doi_prefix=10.1101");
            urls.push("https://api.altmetric.com/v1/citations/" + tf + "?num_results=100&page=" + page + "&doi_prefix=10.1101");
        }
    )});
    return urls;
}
 
/* 
Use filteredData as input, use bioRxiv API to retrive detailed info according to altmetric_jid and doi
*/
function getBioRxivData(filteredData) {
    var urls = [];
    filteredData.forEach(item => {
        urls.push("https://api.biorxiv.org/details/" + item.altmetric_jid + "/" + item.doi);

    });
    var result = [];
    var promises = [];
    var delay = 0;
    for (let i = 0; i < urls.length; i++) { 
        //console.log("Fetching " + urls[i]);
        var promise = new Promise((resolve, reject) => {
            setTimeout(() => {
              axios.get(urls[i])
                .then(response => {
                  result.push(...response.data.collection);
                  resolve();
                })
                .catch(error => reject(error))
                .finally(() => {
                    printProgressBar(i/urls.length, "Fetching bioRxiv data"); // 更新进度条
                  });
            }, delay);
            delay += 1000; // 设置1秒的时间间隔
          });
          promises.push(promise);
    }
    return Promise.all(promises).then(() => result);
}


function getAltData() {
    var urls = getAltUrls(timeframe = ['1d','3d','1w','1m'], pageList = [1,2,3,4,5]);
    var result = [];
    var promises = [];
    var delay = 0;
    for (let i = 0; i < urls.length; i++) {
        var promise = new Promise((resolve, reject) => {
          setTimeout(() => {
            axios.get(urls[i])
              .then(response => {
                result.push(...response.data.results);
                resolve();
              })
              .catch(error => reject(error))
          }, delay);
          delay += 500; // 设置1秒的时间间隔
        });
        promises.push(promise);
      }
      return Promise.all(promises).then(() => result);
}

// 搞个进度条出来
function printProgressBar(percent, name) {
    const maxBarLength = 50; // 进度条的最大长度
    const barLength = Math.round(percent * maxBarLength); // 计算进度条的长度
  
    const bar = '■'.repeat(barLength).padEnd(maxBarLength, '□'); // 构造带进度的进度条
    const percentage = Math.round(percent * 100); // 计算百分比
  
    console.clear(); // 清空控制台
    console.log(name +' : ' + `[${bar}] ${percentage}%`); // 输出进度条
  }

async function main(){
    getAltData().then(function(data) {
    //console.log(data.length); // 在所有请求完成后输出结果数组

    // 去重
    const uniqueData = Object.values(data.reduce((accumulator, current) => {
        accumulator[current.doi] = accumulator[current.doi] || current;
        return accumulator;
      }, {}));
    console.log("Find " + uniqueData.length + " Altmetric datas.");

    // Use history.1d, 3d, 1w, 1m of uniqueData  to X1d, X3d, X1w, X1m
    // Only reserve title, doi, altmetric_jid, score and X1d, X3d, X1w, X1m
    const renamedData = uniqueData.map((item) => {
        const { history, ...rest } = item;
        return {
            ...rest,
            X1d: history['1d'],
            X3d: history['3d'],
            X1w: history['1w'],
            X1m: history['1m'],
        }
    } ).map(({ title, doi, altmetric_jid, score, X1d, X3d, X1w, X1m }) => ({ title, doi, altmetric_jid, score, X1d, X3d, X1w, X1m }));
    
    //console.log(renamedData[0]);

    // replace altmetric_jid = 532721422a83ee84788b4567 with biorxiv, then only keep altmetric_jid = biorxiv or medrxiv
    const filteredData = renamedData.filter((item) => {
        if (item.altmetric_jid == '532721422a83ee84788b4567') {
            item.altmetric_jid = 'biorxiv';
        }
        return item.altmetric_jid == 'biorxiv' || item.altmetric_jid == 'medrxiv';
    });

    //console.log(renamedData.length);
    //console.log(filteredData.length);
    //console.log(filteredData[0]);

    // Use filteredData as input, use bioRxiv API to retrive detailed info according to altmetric_jid and doi
    getBioRxivData(filteredData).then(data => {
        //其中每个doi只保留version值最大的那个结果
        const map = new Map();
        data.forEach(item => {
            if(!map.has(item.doi) || map.get(item.doi).version < item.version){
              map.set(item.doi, item);
            }
        });
        const biorxivDedup = Array.from(map.values());

        //merge filteredData and biorxivDedup by doi
        const mergedData = filteredData.reduce((acc, obj1) => {
            const obj2 = biorxivDedup.find((obj2) => obj2.doi === obj1.doi);
            if (obj2) {
                acc.push(Object.assign({}, obj1, obj2, {upupdate_time : Date.now()} ));
            }
            return acc;
        }, []);

        // 计算三个月前的日期
        var threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // filter mergedData by date, in three months
        const filteredMergedData = mergedData.filter((item) => {
            var date = new Date(item.date); // 假设JSON数据中的日期保存在date字段中
            return date >= threeMonthsAgo;
        });

        // output mergedData in csv format
        const csvData = json2csv(filteredMergedData);
        fs.writeFile('data.csv', csvData, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log('CSV file has been written');
            }
          });
        //console.log(mergedData[0]);
    })

});
}

main()