const Channel = require('./channel.js');

const num_tourists = 25;
const num_computers = 8;
const min_time = 15;
const max_time = 120;

// Note: indexed from 1 because I am obtuse
const range = num => {
    return Array.from(new Array(num), (_, index) => index + 1);
};

const take = (array, num) => {
    return [array.slice(0, num), array.slice(num)];
};

// Copied from MDN because I am lazy.
const random_int = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max) + 1;
  return Math.floor(Math.random() * (max - min)) + min;
};

const timeout = (minutes) => {
    return new Promise((resolve, _) => {
	setTimeout(() => resolve(), minutes);
    });
};

const online = channel => async (tourist) => {
    let current = tourist;
    while(current) {
	let time = random_int(min_time, max_time);
	console.log('Tourist ' + current + ' is online.');
	await timeout(time);
	console.log('Tourist ' + current + ' is done, having spent ' +
		    time + ' minutes online.');
	try {
	    current = await channel.read();
	} catch(_) {
	    current = null;
	}
    }
    return Promise.resolve;
};

const waiting = channel => async (tourist) => {
    console.log('Tourist ' + tourist + ' is waiting for turn.');
    await channel.write(tourist.toString());
    return Promise.resolve;
};

const computers = async(channel, tourists) => {
    await Promise.all(tourists.map(online(channel)));
    console.log("The place is empty, let's close up and go to the beach!");
};

const queue = async (channel, tourists) => {
    await Promise.all(tourists.map(waiting(channel)));
    channel.close();
    console.log("channel is closed");
};

const [head, tail] = take(range(num_tourists), num_computers);
const channel = new Channel('/tmp/cafe');
computers(channel, head);
queue(channel, tail);
