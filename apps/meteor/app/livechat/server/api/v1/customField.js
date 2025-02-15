import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { API } from '../../../../api/server';
import { findGuest } from '../lib/livechat';
import { Livechat } from '../../lib/Livechat';
import { findLivechatCustomFields, findCustomFieldById } from '../lib/customFields';

API.v1.addRoute('livechat/custom.field', {
	async post() {
		check(this.bodyParams, {
			token: String,
			key: String,
			value: String,
			overwrite: Boolean,
		});

		const { token, key, value, overwrite } = this.bodyParams;

		const guest = await findGuest(token);
		if (!guest) {
			throw new Meteor.Error('invalid-token');
		}

		if (!(await Livechat.setCustomFields({ token, key, value, overwrite }))) {
			return API.v1.failure();
		}

		return API.v1.success({ field: { key, value, overwrite } });
	},
});

API.v1.addRoute('livechat/custom.fields', {
	async post() {
		check(this.bodyParams, {
			token: String,
			customFields: [
				Match.ObjectIncluding({
					key: String,
					value: String,
					overwrite: Boolean,
				}),
			],
		});

		const { token } = this.bodyParams;
		const guest = await findGuest(token);
		if (!guest) {
			throw new Meteor.Error('invalid-token');
		}

		const fields = await Promise.all(
			this.bodyParams.customFields.map(async (customField) => {
				const data = Object.assign({ token }, customField);
				if (!(await Livechat.setCustomFields(data))) {
					return API.v1.failure();
				}

				return { Key: customField.key, value: customField.value, overwrite: customField.overwrite };
			}),
		);

		return API.v1.success({ fields });
	},
});

API.v1.addRoute(
	'livechat/custom-fields',
	{ authRequired: true, permissionsRequired: ['view-l-room'] },
	{
		async get() {
			const { offset, count } = this.getPaginationItems();
			const { sort } = this.parseJsonQuery();
			const { text } = this.queryParams;

			const customFields = await findLivechatCustomFields({
				text,
				pagination: {
					offset,
					count,
					sort,
				},
			});

			return API.v1.success(customFields);
		},
	},
);

API.v1.addRoute(
	'livechat/custom-fields/:_id',
	{ authRequired: true, permissionsRequired: ['view-l-room'] },
	{
		async get() {
			check(this.urlParams, {
				_id: String,
			});
			const { customField } = await findCustomFieldById({ customFieldId: this.urlParams._id });

			return API.v1.success({
				customField,
			});
		},
	},
);
