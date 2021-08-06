import fs from 'fs';
import yaml from 'js-yaml';
function load () {
	const fileContents = fs.readFileSync('./src/.env.yml', 'utf8');
	if (!fileContents) {
		console.log('Cannot load file contents')
	}
	let data = yaml.load(fileContents);

	data = data['dev'];

	['common', 'stripe', 'elastic', 'transloadit', 'backblaze', 'postgres'].forEach((module) => {
		console.log(`Loading in ${module} env variables`)
		Object.keys(data[module]).forEach((key) => {
			const val = data[module][key]
			console.log(`Make ${key} be ${val}`)
			process.env[key] = val
		})
	})
}
export default load()
