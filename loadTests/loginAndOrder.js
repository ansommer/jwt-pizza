import { sleep, check, group, fail } from 'k6';
import http from 'k6/http'
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

export const options = {
  cloud: {
    distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    loginAndOrder: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 5, duration: '30s' },
        { target: 15, duration: '1m' },
        { target: 10, duration: '30s' },
        { target: 0, duration: '30s' },
      ],
      gracefulRampDown: '30s',
      exec: 'loginAndOrder',
    },
  },
}

export function loginAndOrder() {
  let response

  const vars = {}

  // Login
  response = http.put('https://pizza-service.ansommer.click/api/auth', '{"email":"d@jwt.com","password":"diner"}', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      dnt: '1',
      origin: 'https://pizza.ansommer.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Chromium";v="158", "Not.A/Brand";v="24", "Google Chrome";v="158"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })
  if (!check(response, { 'Login status equals 200': (response) => response.status.toString() === '200' })) {
    console.log(response.body);
    fail('Login was *not* 200');
  }

  vars['token'] = jsonpath.query(response.json(), '$.token')[0]

  sleep(7.4)

  // Load menu
  response = http.get('https://pizza-service.ansommer.click/api/order/menu', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      authorization: `Bearer ${vars['token']}`,
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      dnt: '1',
      origin: 'https://pizza.ansommer.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Chromium";v="158", "Not.A/Brand";v="24", "Google Chrome";v="158"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })

  // Load stores
  response = http.get('https://pizza-service.ansommer.click/api/franchise?page=0&limit=20&name=*', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      authorization: `Bearer ${vars['token']}`,
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      dnt: '1',
      origin: 'https://pizza.ansommer.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Chromium";v="158", "Not.A/Brand";v="24", "Google Chrome";v="158"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })
  sleep(3.8)

  // Load order
  response = http.get('https://pizza-service.ansommer.click/api/user/me', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      authorization: `Bearer ${vars['token']}`,
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      dnt: '1',
      origin: 'https://pizza.ansommer.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Chromium";v="158", "Not.A/Brand";v="24", "Google Chrome";v="158"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })
  sleep(1.7)

  // Create order
  response = http.post(
    'https://pizza-service.ansommer.click/api/order',
    '{"items":[{"menuId":2,"description":"Pepperoni","price":0.0042}],"storeId":"1","franchiseId":1}',
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        authorization: `Bearer ${vars['token']}`,
        'cache-control': 'no-cache',
        'content-type': 'application/json',
        dnt: '1',
        origin: 'https://pizza.ansommer.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="158", "Not.A/Brand";v="24", "Google Chrome";v="158"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    }
  )
  if (!check(response, { 'Purchase status equals 200': (response) => response.status.toString() === '200' })) {
    console.log(response.body);
    fail('Order was *not* 200');
  }

  vars['jwt'] = jsonpath.query(response.json(), '$.jwt')[0]

  sleep(1.9)

  // Verify order
  response = http.post(
    'https://pizza-factory.cs329.click/api/order/verify',
    JSON.stringify({ jwt: vars['jwt'] }),
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        authorization: `Bearer ${vars['token']}`,
        'cache-control': 'no-cache',
        'content-type': 'application/json',
        dnt: '1',
        origin: 'https://pizza.ansommer.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="158", "Not.A/Brand";v="24", "Google Chrome";v="158"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-storage-access': 'none',
      },
    }
  )

  if (!check(response, { 'pizza JWT is valid': (response) => response.status === 200 && response.json('message') === 'valid',})) {
    console.log(response.body);
    fail('Pizza JWT verification failed');
  }
}
