export type CustomSQLParamOpts = {
	castTo: string | undefined,
	typeHint?: string,
	value: any
	valueType?: string
}
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
