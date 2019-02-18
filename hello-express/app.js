const express = require('express');
const app = express();

const square = require('./square');

console.log('边长为 4 的正方形面积为 ' + square.area(4));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(3000, () => {
    console.log('示例应用正在监听 3000 端口!');
});
