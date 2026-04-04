import { isEmpty } from 'radash';

export const BaseApiRequestService = {
  perform: (
    method: string,
    urlPath: string,
    requestJsonBody?: Record<string, unknown> | unknown[],
    urlencodedParams?: Record<string, string>,
    formParams?: Record<string, string | Blob>,
  ): Promise<Response> => {
    const headers = new Headers({ Accept: '*/*' });

    let body: BodyInit | undefined;

    // Construct request body
    if (!isEmpty(requestJsonBody)) {
      // JSON content
      headers.append('Content-Type', 'application/json');
      body = JSON.stringify(requestJsonBody);
    } else if (urlencodedParams && !isEmpty(urlencodedParams)) {
      headers.append('Content-Type', 'application/x-www-form-urlencoded');
      const urlSearchParams = new URLSearchParams();
      for (const param of Object.keys(urlencodedParams)) {
        urlSearchParams.append(param, urlencodedParams[param]);
      }
      body = urlSearchParams;
    } else if (formParams && !isEmpty(formParams)) {
      const formData = new FormData();
      for (const formParam of Object.keys(formParams)) {
        formData.append(formParam, formParams[formParam]);
      }
      body = formData;
    }

    const requestOptions: RequestInit = {
      method: method.toUpperCase(),
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
      headers,
      ...(body !== undefined && { body }),
    };

    return fetch(urlPath, requestOptions);
  },
};
