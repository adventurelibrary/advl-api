import fs from 'fs';
import yaml from 'js-yaml';
function load () {
	const fileContents = fs.readFileSync('./src/.env.yml', 'utf8');
	if (!fileContents) {
		console.log('Cannot load file contents')
	}
	const data = yaml.load(fileContents);
	['elastic', 'transloadit', 'backblaze', 'postgres'].forEach((module) => {
		console.log(`Loading in ${module} env variables`)
		Object.keys(data[module]).forEach((key) => {
			const val = data[module][key]
			process.env[key] = val
		})
	})
}
export default load()
