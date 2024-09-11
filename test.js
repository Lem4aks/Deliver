async function getCoordinates(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.length > 0) {
      const { lon, lat } = data[0];
      return { longitude: lon, latitude: lat };
  } else {
      throw new Error('Нет кординатов в ответе');
  }
}

async function getDuration(add1, add2) {
  const coordinates1 = await getCoordinates(add1);
  const coordinates2 = await getCoordinates(add2);

  const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates1.longitude},${coordinates1.latitude};${coordinates2.longitude},${coordinates2.latitude}?overview=false&alternatives=true&steps=true`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.routes && data.routes.length > 0) {
      return data.routes[0].duration;
  } else {
      throw new Error('Нет маршрутов в ответе');
  }
}

const deliveries = [
  { id: 1, street: "Исторична 18, Запорожье", time: "09:00-10:00" },
  { id: 2, street: "Перемоги 19, Запорожье", time: "09:00-10:00" },
  { id: 6, street: "Перемоги 115, Запорожье", time: "09:00-9:30" },
  { id: 7, street: "Перемоги 10, Запорожье", time: "09:00-9:30" },
  { id: 3, street: "Перемоги 5, Запорожье", time: "11:00-12:00" },
  { id: 4, street: "Перемоги 16, Запорожье", time: "10:00-12:00" },
  { id: 5, street: "Исторична 38", time: "12:00-13:00" }
];

const cars = [
  { id: 1, availableFrom: "09:00", availableTo: "21:00", currentLocation: "Исторична 1, Запорожье", deliveries: [], currentTime: "09:00" },
  { id: 2, availableFrom: "09:00", availableTo: "21:00", currentLocation: "Перемоги 65, Запорожье", deliveries: [], currentTime: "09:00" }
];

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

async function assignDeliveriesToCars() {
  const sortedDeliveries = deliveries.sort((a, b) => timeToMinutes(a.time.split('-')[0]) - timeToMinutes(b.time.split('-')[0]));

  for (const delivery of sortedDeliveries) {
    const [deliveryStart, deliveryEnd] = delivery.time.split('-').map(timeToMinutes);
    let bestCar = null;
    let bestArrivalTime = Infinity;

    for (const car of cars) {
      const currentTime = timeToMinutes(car.currentTime);
      if (currentTime > deliveryEnd) {
        continue;
      }

      const travelTime = await getDuration(car.currentLocation, delivery.street);
      const arrivalTime = currentTime + Math.ceil(travelTime / 60);

      if (arrivalTime <= deliveryEnd && arrivalTime < bestArrivalTime) {
        bestCar = car;
        bestArrivalTime = arrivalTime;
      }
    }

    if (bestCar) {
      bestCar.deliveries.push(delivery.id);
      bestCar.currentLocation = delivery.street;
      bestCar.currentTime = minutesToTime(Math.max(bestArrivalTime, deliveryStart) + 5);
      console.log(`Машина ${bestCar.id} предположительно завершит доставку посылки ${delivery.id} к ${bestCar.currentTime}`);
    } else {
      console.log(`Не удалось найти подходящую машину для доставки посылки ${delivery.id} в нужный интервал.`);
    }
  }

  //for (const car of cars) {
  //  console.log(`Машина ${car.id} доставит посылки: [${car.deliveries.join(', ')}]`);
  //}
}

async function test() {
  try {
    const duration = await getDuration("Исторична 1, Запорожье","Перемоги 2, Запорожье");
    console.log('Duration:', duration);
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

//test()
assignDeliveriesToCars();


