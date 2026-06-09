// scratch/check_endpoint.js
async function check() {
  try {
    const res = await fetch('http://localhost:3001/api/network/devices');
    console.log('Status Code:', res.status);
    if (res.status === 404) {
      console.log('Endpoint NOT found. The server might need to be restarted.');
    } else if (res.status === 401) {
      console.log('Endpoint exists (returned 401 Unauthorized, as expected without token).');
    } else {
      console.log('Endpoint returned status:', res.status);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}
check();
