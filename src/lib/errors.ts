export class APIError {
	status: number
	key: string
	message?: string
	details: any[]

	constructor ({status, key, message, details} : any) {
		this.status = status
		this.key = key
		this.message = message
		this.details = details
	}
}



export type ValidationError = {
	field?: string
	message?: string
}

export class Validation {
	errors: ValidationError[] = []
	isValid () {
		return this.errors.length == 0
	}

	validateRequired(value: any, {message, field}: {message?: string, field?: string}) {
		if (!value) {
			this.addError({
				message,
				field
			})
		}
	}

	addError (error: ValidationError) {
		if (!error.message && !error.field) {
			console.warn(`Creating an error with no field and no message`)
		}
		this.errors.push(error)
	}

	throwIfErrors () {
		if (!this.isValid()) {
			throw this.getError()
		}
	}

	getError () {
		const err = new APIError()
		err.key = 'validation'
		err.details = this.errors
		err.message = 'Validation errors'
		err.status = 400 // Bad request
		return err
	}
}
