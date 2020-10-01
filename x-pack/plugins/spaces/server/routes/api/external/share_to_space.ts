/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../../../lib/errors';
import { ExternalRouteDeps } from '.';
import { SPACE_ID_REGEX } from '../../../lib/space_schema';
import { createLicensedRouteHandler } from '../../lib';
import { ALL_SPACES_STRING } from '../../../lib/utils/namespace';

const uniq = <T>(arr: T[]): T[] => Array.from(new Set<T>(arr));
export function initShareToSpacesApi(deps: ExternalRouteDeps) {
  const { externalRouter, getStartServices, authorization } = deps;

  const shareSchema = schema.object({
    spaces: schema.arrayOf(
      schema.string({
        validate: (value) => {
          if (value !== ALL_SPACES_STRING && !SPACE_ID_REGEX.test(value)) {
            return `lower case, a-z, 0-9, "_", and "-" are allowed, OR "*"`;
          }
        },
      }),
      {
        validate: (spaceIds) => {
          if (!spaceIds.length) {
            return 'must specify one or more space ids';
          } else if (uniq(spaceIds).length !== spaceIds.length) {
            return 'duplicate space ids are not allowed';
          }
        },
      }
    ),
    object: schema.object({ type: schema.string(), id: schema.string() }),
  });

  externalRouter.get(
    {
      path: '/internal/spaces/_share_saved_object_permissions',
      validate: { query: schema.object({ type: schema.string() }) },
    },
    createLicensedRouteHandler(async (_context, request, response) => {
      let shareToAllSpaces = true;
      const { type } = request.query;

      if (authorization) {
        try {
          const checkPrivileges = authorization.checkPrivilegesWithRequest(request);
          shareToAllSpaces = (
            await checkPrivileges.globally({
              kibana: authorization.actions.savedObject.get(type, 'share_to_space'),
            })
          ).hasAllRequested;
        } catch (error) {
          return response.customError(wrapError(error));
        }
      }
      return response.ok({ body: { shareToAllSpaces } });
    })
  );

  externalRouter.post(
    { path: '/api/spaces/_share_saved_object_add', validate: { body: shareSchema } },
    createLicensedRouteHandler(async (_context, request, response) => {
      const [startServices] = await getStartServices();
      const scopedClient = startServices.savedObjects.getScopedClient(request);

      const spaces = request.body.spaces;
      const { type, id } = request.body.object;

      try {
        await scopedClient.addToNamespaces(type, id, spaces);
      } catch (error) {
        return response.customError(wrapError(error));
      }
      return response.noContent();
    })
  );

  externalRouter.post(
    { path: '/api/spaces/_share_saved_object_remove', validate: { body: shareSchema } },
    createLicensedRouteHandler(async (_context, request, response) => {
      const [startServices] = await getStartServices();
      const scopedClient = startServices.savedObjects.getScopedClient(request);

      const spaces = request.body.spaces;
      const { type, id } = request.body.object;

      try {
        await scopedClient.deleteFromNamespaces(type, id, spaces);
      } catch (error) {
        return response.customError(wrapError(error));
      }
      return response.noContent();
    })
  );
}
