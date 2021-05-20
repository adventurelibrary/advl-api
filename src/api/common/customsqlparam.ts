export type CustomSQLParamOpts = {
	castTo: string | undefined,
	typeHint?: string,
	value: any
	valueType?: string
}

// This custom class allows us to specify our fields with a 'castTo' property so we can properly build our
// queries.
// This class has the same properties that RDS expects for its SQLParameters, with the addition of the castTo
// It's a class instead of a type so we can detect it in our code with "instanceof"
export default class CustomSQLParam {
	valueType = ''
	typeHint = ''
	value : any
	castTo: string | undefined
	constructor ({valueType = 'stringValue', castTo, typeHint, value} : CustomSQLParamOpts) {
		this.valueType = valueType
		this.typeHint = typeHint
		this.value = value
		this.castTo = castTo
	}
}
