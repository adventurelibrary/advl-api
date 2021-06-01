import test from 'ava'

test('db: left join', async (t) => {
	t.pass()
	// TODO: Run a real query against a schema that is stored in our project
	//	this query below is based on some slapdash database creation
	/*// Get all users and left join any creators they own
	const res = await request('database', {
		method: 'POST',
		body: {
			query: `
SELECT c.name, u.id as user_id
FROM vin_users u
LEFT JOIN vin_creators c
ON c.owner_id = u.id
WHERE u.is_admin = :p0
`,
			params: [false]
		}
	})
	const json = await res.json()
	console.log('json', json)
	if (json.error) {
		t.fail(json.error)
	}
	t.pass()*/
})
