import { Button, Input, Form, ButtonType, Paragraph, Card, CardAlignment, Container, InputType, Flex, FlexBehavior, FlexJustify, CardBody } from 'react-magma-dom';
import { AuthService, Enrollment, AuthenticationResponse } from 'common-experience-client';
import { useState } from 'react';

export interface DevLoginFormProps {
  setUserData: (userData: AuthenticationResponse) => void;
}
export const isErrorResp = (arg: any): arg is Error => {
  if (typeof arg === 'object') {
    return typeof arg.statusText === 'string' && typeof arg.status === 'number';
  }
  return false;
};

const DevLoginForm: React.FC<DevLoginFormProps> = ({ setUserData }) => {
  const initNetworkError = { error: false, message: '' };
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inputErrors, setInputErrors] = useState({ username: false, password: false });
  const [networkError, setNetworklError] = useState(initNetworkError);
  const [isLoading, setIsloading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nameLen = username.length < 1;
    const pwLen = password.length < 1;
    setInputErrors({ username: nameLen, password: pwLen });

    if (nameLen || pwLen) {
      return;
    }
    setIsloading(true);

    try {
      const res = await AuthService.authenticate(username.trim(), password);
      /*if (res.status === 'failure') {
        throw new Error(res.reason);
      }*/

      if (res.token) {
        const userData = {
          ...res,
          courses: res.courses.sort((courseA: Enrollment, courseB: Enrollment) => {
            return courseA.title.localeCompare(courseB.title, undefined, {
              numeric: true,
            });
          }),
        };
        setUserData(userData);
      }
    } catch (error) {
      let errMessage = 'Service Error';
      if (error instanceof Error ){//|| axios.isAxiosError(error)) {
        errMessage = error.message;
      } else if (isErrorResp(error)) {
        //errMessage = `${error.status} ${error.statusText}`;
      }
      setNetworklError({ error: true, message: errMessage });
      setIsloading(false);
    }
  };

  return (
    <Flex behavior={FlexBehavior.both} justify={FlexJustify.center}>
      <Card 
        hasDropShadow
        align={CardAlignment.left}
        width={600}
      >
        <CardBody>
            <Form
            header="MindTap School"
            onSubmit={handleSubmit}
            errorMessage={networkError.error ? networkError.message : undefined}
            actions={
                <Button type={ButtonType.submit} isLoading={isLoading} isFullWidth>
                Submit
                </Button>
            }
            >
            <Paragraph>
                Test Login Page
                <br /> Please enter a valid username and password for a Cengage SSO user:
            </Paragraph>
            <Input
                errorMessage={inputErrors.username ? 'Required' : undefined}
                labelText="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
            />
            <Input
                errorMessage={inputErrors.password ? 'Required' : undefined}
                labelText="Password"
                type={InputType.password}
                value={password}
                onChange={e => setPassword(e.target.value)}
            />
            </Form>
        </CardBody>
      </Card>
    </Flex>
  );
};

export default DevLoginForm;
