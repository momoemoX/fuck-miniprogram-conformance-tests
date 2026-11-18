function echo(url, binary) {
  return new Promise((resolve, reject) => {
    const task = wx.connectSocket({ url, complete() {} });
    const sequence = [];
    const timer = setTimeout(() => {
      task.close({ code: 1000 });
      reject(new Error("Socket echo timed out"));
    }, 6000);
    task.onError((error) => {
      clearTimeout(timer);
      reject(new Error(error.errMsg || "Socket error"));
    });
    task.onOpen(() => {
      sequence.push("open");
      task.send({ data: binary ? new Uint8Array([0, 125, 255]).buffer : "socket-echo" });
    });
    task.onMessage((event) => {
      sequence.push(binary ? Array.from(new Uint8Array(event.data)) : event.data);
      task.close({ code: 1000, reason: "done" });
    });
    task.onClose((event) => {
      clearTimeout(timer);
      sequence.push(event.code);
      resolve(sequence);
    });
  });
}

async function sockets(url, check) {
  await check("socket.text-echo", ["open", "socket-echo", 1000], () => echo(url, false));
  await check("socket.binary-echo", ["open", [0, 125, 255], 1000], () => echo(url, true));
}
module.exports = { sockets };
