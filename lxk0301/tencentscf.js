// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
const tencentcloud = require("tencentcloud-sdk-nodejs");
const fs = require('fs')
const yaml = require('js-yaml');

const ScfClient = tencentcloud.scf.v20180416.Client;

const clientConfig = {
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: process.env.TENCENT_REGION, // 区域参考，https://cloud.tencent.com/document/product/213/6091
  profile: {
    httpProfile: {
      endpoint: "scf.tencentcloudapi.com",
    },
  },
};
const sleep = ms => new Promise(res => setTimeout(res, ms));
!(async () => {
  const client = new ScfClient(clientConfig);

  let params
  await client.ListFunctions({}).then(
    async (data) => {
      let func = data.Functions.filter(vo=>vo.FunctionName===process.env.TENCENT_FUNCTION_NAME)
      const file_buffer  = fs.readFileSync('./myfile.zip');
      const contents_in_base64 = file_buffer.toString('base64');
      if(func.length){
        console.log(`函数已存在，去更新函数`)
        // 更新代码
        params = {
          "Handler": "index.main_handler",
          "FunctionName": process.env.TENCENT_FUNCTION_NAME,
          "ZipFile": contents_in_base64
        };
        await client.UpdateFunctionCode(params).then(
          (data) => {
            console.log(data);
          },
          (err) => {
            console.error("error", err);
          }
        );
      } else{
        console.log(`函数不存在，去创建函数`)
        params = {
          "Code": {
            "ZipFile": contents_in_base64
          },
          "FunctionName": process.env.TENCENT_FUNCTION_NAME,
          "Runtime": "Nodejs12.16"
        };
        await client.CreateFunction(params).then(
          (data) => {
            console.log(data);
          },
          (err) => {
            console.error("error", err);
          }
        );
        await sleep(1000*100) // 等待100秒
      }
    },
    (err) => {
      console.error("error", err);
    }
  );

  console.log(`更新环境变量`)
  // 更新环境变量
  let inputYML = '.github/workflows/deploy_tencent_scf.yml';
  let obj = yaml.load(fs.readFileSync(inputYML, {encoding: 'utf-8'}))
  let vars = []
  for(let key in obj.jobs.build.steps[3].env){
    if(key!=='PATH' && process.env.hasOwnProperty(key))
      vars.push({
        "Key": key,
        "Value": process.env[key]
      })
  }
  console.log(`您一共填写了${vars.length}个环境变量`)
  params = {
    "FunctionName": process.env.TENCENT_FUNCTION_NAME,
    "Environment": {
      "Variables": vars
    }
  };
  await client.UpdateFunctionConfiguration(params).then(
    (data) => {
      console.log(data);
    },
    (err) => {
      console.error("error", err);
    }
  );
  let triggers = []
  params = {
    "FunctionName": process.env.TENCENT_FUNCTION_NAME,
  }
  await client.ListTriggers(params).then(
    (data) => {
      console.log(data);
      triggers = data.Triggers
    },
    (err) => {
      console.error("error", err);
    }
  );
  for(let vo of triggers){
    params = {
      "FunctionName": process.env.TENCENT_FUNCTION_NAME,
      "Type": "timer",
      "TriggerName": vo.TriggerName
    }
    await client.DeleteTrigger(params).then(
      (data) => {
        console.log(data);
      },
      (err) => {
        console.error("error", err);
      }
    );
  }
  // 更新触发器
  console.log(`去更新触发器`)
  inputYML = 'serverless.yml';
  obj = yaml.load(fs.readFileSync(inputYML, {encoding: 'utf-8'}))
  for(let vo of obj.inputs.events){
    let param = {
      "FunctionName": process.env.TENCENT_FUNCTION_NAME,
      "TriggerName": vo.timer.parameters.name,
      'Type' : "timer",
      'TriggerDesc' : vo.timer.parameters.cronExpression,
      'CustomArgument' : vo.timer.parameters.argument,
      'Enable' : "OPEN",
    }
    await client.CreateTrigger(param).then(
      (data) => {
        console.log(data);
      },
      (err) => {
        console.error("error", err);
      }
    );
  }

})()
  .catch((e) => console.log(e))
  .finally(async () => {
  })
