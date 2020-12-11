const bcrypt = require('bcryptjs')
const User = require('../models/user')
const Event = require('../models/event')
const Booking = require('../models/booking')
const { dateToString } = require('../../helpers/date')

const transformEvent = (event) => {
  return {
    ...event._doc,
    date: dateToString(event._doc.date),
    creator: user.bind(this, event.creator),
  }
}

const transformBooking = (booking) => {
  return {
    ...booking._doc,
    user: user.bind(this, booking._doc.user),
    event: singleEvent.bind(this, booking._doc.event),
    createdAt: dateToString(booking._doc.createdAt),
    updatedAt: dateToString(booking._doc.updatedAt),
  }
}
const singleEvent = async (eventId) => {
  try {
    const event = await Event.findById(eventId)
    return transformEvent(event)
  } catch (e) {
    throw e
  }
}

// these two functions below allow access to object of nested relationship of docs
const user = (userId) => {
  return User.findById(userId)
    .then((user) => {
      return {
        ...user._doc,
        createdEvents: events.bind(this, user._doc.createdEvents),
      }
    })
    .catch((err) => {
      throw err
    })
}

const events = (eventIds) => {
  return Event.find({ _id: { $in: eventIds } }).then((events) => {
    return events.map((event) => {
      return {
        ...event._doc,
        date: dateToString(event._doc.date),
        creator: user.bind(this, event._doc.creator),
      }
    })
  })
}

module.exports = {
  events: () => {
    return (
      Event.find()
        // .populate('creator') //populate any relation - looks for Ref
        .then((events) => {
          return events.map((event) => {
            return transformEvent(event)
          })
        })
        .catch((err) => {
          throw err
        })
    )
  },
  users: () => {
    return User.find()
      .then((users) => {
        return users.map((user) => {
          return {
            ...user._doc,
          }
        })
      })
      .catch((err) => {
        throw err
      })
  },
  bookings: async () => {
    try {
      const bookings = await Booking.find()
      return bookings.map((booking) => {
        return transformBooking(booking)
      })
    } catch (e) {}
  },
  createEvent: (args) => {
    const event = new Event({
      title: args.eventInput.title,
      description: args.eventInput.description,
      price: +args.eventInput.price, //convert it to float
      date: dateToString(args.eventInput.date),
      creator: '5fcdb46b31ec208a79697205',
    })
    let createdEvent
    return event
      .save()
      .then((result) => {
        createdEvent = transformEvent(result)
        return User.findById('5fcdb46b31ec208a79697205')
      })
      .then((user) => {
        if (!user) {
          throw new Error('User not found.')
        }
        user.createdEvents.push(event)
        return user.save()
      })
      .then((result) => {
        return createdEvent
      })
      .catch((err) => {
        throw err
      })
  },
  createUser: (args) => {
    return User.findOne({ email: args.userInput.email }).then((user) => {
      //always will be in then block
      if (user) {
        throw new Error('User exists already')
      }
      return bcrypt
        .hash(args.userInput.password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: args.userInput.email,
            password: hashedPassword,
          })
          return user.save()
        })
        .then((result) => {
          return { ...result._doc }
        })
        .catch((err) => {
          throw err
        })
    })
  },
  bookEvent: async (args) => {
    const fetchedEvent = await Event.findOne({ _id: args.eventId })
    const booking = new Booking({
      user: '5fcdb46b31ec208a79697205',
      event: fetchedEvent,
    })
    const result = await booking.save()
    return {
      ...result._doc,
      user: user.bind(this, booking._doc.user),
      event: singleEvent.bind(this, booking._doc.event),
      createdAt: dateToString(result._doc.createdAt),
      updatedAt: dateToString(result._doc.updatedAt),
    }
  },
  cancelBooking: async (args) => {
    try {
      const booking = await Booking.findById(args.bookingId).populate('event')
      const event = transformEvent(booking.event)
      await Booking.deleteOne({ _id: args.bookingId })
      return event
    } catch (e) {
      throw e
    }
  },

  login: async ({ email, password }) => {
    const user = User.findOne({ email: email })
    if (!user) {
      throw new Error('User does not exist')
    }
    const isEqual = await bcrypt.compare(password, user.password)
    if (!isEqual) {
      throw new Error('Password is incorrect')
    }
  },
}
