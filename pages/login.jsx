import React, { useEffect, useState } from 'react';
import '@/styles/mobile_style.css';
import { Form, Input, Button, message } from 'antd';
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo';
import axios from 'axios';
import { getServerSideProps } from '@/components/MainVariable.jsx';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import { isMobile } from 'react-device-detect';
const Login = ({ BaseUrl, CustomerToken }) => {
  const [form] = Form.useForm();
  const [clientDetail, setClientDetail] = useState();
  const router = useRouter();
  useEffect(() => {
    if (isMobile==false) {
      router.push(`/`);
    }
    const fetchData = async () => {
      try {
        const result = await axios.get(`${BaseUrl}/get-customer-record/`, {
          headers: {
            Authorization: CustomerToken,
          },
        });
       

        var domain_url = result.data.domain_url;
        if (domain_url) {
          setClientDetail(domain_url);
          const BusinessBaseurl = `https://${domain_url}`;
          localStorage.setItem('BusinessBaseurl', BusinessBaseurl);
        }
        form.setFieldsValue(result.data);
        console.log(result.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [form]);

  const onFinish = (values) => {
    console.log('Received values:', values);
    var Business_Url = localStorage.getItem('BusinessBaseurl');
    const addValues = {
      ...values,
      domain_url: clientDetail,
    };
    axios
      .post(`${Business_Url}/add-customer/`, addValues)
      .then((response) => {
        if (response.data.status === 200) {
          localStorage.setItem('business_access_token', response.data.data.token.access);
          localStorage.setItem('business_access_refresh', response.data.data.token.refresh);
          localStorage.removeItem('randomCyl');
          localStorage.removeItem('randomSph');
          message.success(response.data.messages);
          router.push(`/otp-verify/`);
        }
      })
      .catch((error) => {
        message.error('There is an error for user registration');
        console.log(error);
      });
  };

  // Check if the page is being accessed on a mobile device
  
 
  return (
    

    <section className="main-wrapper">
    <div className="inner-div">
    <Dynmictitle title="Login" />
        <Logo />
        <div className="outer-wrap">
            <div className="bottomwrap">
                <div className="hdngwrap">
                    <h6>Lensometer test</h6>
                    <p>Provide the necessary information for an accurate and efficient assessment.</p>
                </div>
                <Form
                    name="lensometerTest"
                    className="form-login"
                    onFinish={onFinish} form={form}
                >
                    <div className="inputwrap mb-2">
                        <img src="/images/mobile_images/user.png" alt="User" />
                        <Form.Item
                        name="name"
                        rules={[
                          {
                            required: true,
                            message: 'Please enter your name!',
                          },
                        ]}
                      >
                        <Input placeholder="Name" />
                      </Form.Item>
                    </div>
                    <div className="inputwrap">
                        <img src="/images/mobile_images/mail.png" alt="Mail" />
                        <Form.Item
                        name="email"
                        rules={[
                          {
                            type: 'email',
                            message: 'Please enter a valid email address!',
                          },
                          {
                            required: true,
                            message: 'Please enter your email!',
                          },
                        ]}
                      >
                        <Input placeholder="Email Id" />
                      </Form.Item>
                    </div>
                    <div className="next-btn">
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="btnn-next">
                                Next
                            </Button>
                        </Form.Item>
                    </div>
                </Form>
            </div>
        </div>
    </div>
</section>
  );
};

export { getServerSideProps };
export default Login;
