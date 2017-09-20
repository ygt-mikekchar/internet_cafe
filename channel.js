const net = require('net');

module.exports = class Channel {
    constructor(filename) {
        this.server = net.createServer((stream) => this.handleEvent(stream));
        this.server.listen(filename);
        this.wstream = net.connect(filename);
        this.buffer = null;
        this.writeNotify = null;
	this.writePromise = null;
        this.readNotify = null;
    }

    // Returns a promise which will resolve with the data sent to write
    read() {
        if(this.is_closed()) {
	    return Promise.reject('Channel is closed');
        }
        if(this.buffer) {
	    const readPromise = Promise.resolve(this.buffer);
	    this.buffer = null;
	    this.notifyWrite();
	    return readPromise;
        }
        return new Promise((resolve, _) => {
	    this.readNotify = resolve;
        });
    }

    // Returns a promise which will resolve when data has been received
    async write(data) {
        if(this.is_closed()) {
	    return Promise.reject('Channel is closed');
        }
	while(this.writePromise) {
	    await this.writePromise;
	}
	this.wstream.write(data);
        this.writePromise = new Promise((resolve, _) => {
	    this.writeNotify = resolve;
        });
	return this.writePromise;
    }

    // Closes the channel
    close() {
        if(this.is_closed()) {
	    return;
        }
        this.wstream.end();
        this.wstream = null;
    }

    // Returns true if the channel has been closed
    is_closed() {
        return (!this.wstream);
    }

    // Private

    // Handle an event on the read stream of the channel
    handleEvent(stream) {
        stream.on('data', (data) => this.receive(data));
        stream.on('end', () => this.server.close());
    }

    // Notify the reader and writer that the data has arrived
    // I *think* because the read promise is resolved before the write promise,
    // node will return from the read await before the write await.
    receive(data) {
	// If nobody has read yet, buffer the data
        if(!this.readNotify) {
	    this.buffer = data.toString();
	    return;
        }
        this.readNotify(data.toString());
        this.readNotify = null;
	this.notifyWrite();
    }

    notifyWrite() {
        this.writeNotify();
        this.writeNotify = null;
	this.writePromise = null;
    }
};

