import React, { useState, useEffect } from 'react';
import { Input, Button, Form, message} from 'antd';
import '@/styles/mobile_style.css';
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo';
import axios from 'axios';
import { getServerSideProps } from '@/components/MainVariable.jsx';
import { useRouter } from 'next/router';
import { isMobile } from 'react-device-detect';
import getDeviceId from '@/components/deviceId';
import Voice from '@/components/voice';
const OtpVerify = ({ BaseUrl }) => {
  const [form] = Form.useForm();
  const [errorMessages, setErrorMessages] = useState({});
  const [voicecontent, setvoicecontent] = useState('otp-screen');
  const router = useRouter();
  const deviceId = getDeviceId();
  useEffect(() => {
    if (isMobile==false) {
        router.push(`/`);
      }
  },[isMobile]);
  const onFinish = async (values) => {
    var domain_url = localStorage.getItem('BusinessBaseurl');
    const authToken = localStorage.getItem('business_access_token');
    // Handle form submission logic here
    var opt_data = `${values.otp1}${values.otp2}${values.otp3}${values.otp4}`;
    const postData = {
        code: opt_data,
        token: authToken,
        domain_url: domain_url,
        mobile_id:deviceId
    };
    try {
        // Make a POST request using Axios
        const response = await axios.post(`${BaseUrl}/match-code/`, postData);

        if(response.data.status==200){
            localStorage.setItem('mobile-device-id', deviceId);
            message.success(response.data.message)
            //router.push(`/lenso-camera/`)
            setTimeout(() => {
              window.location.href = "/lenso-camera/";

            }, 1000);
        }
        
    } catch (error) {
        console.error('Error during API request:', error);
        if(error.response.status==404){
            message.error(error.response.data.error);
        }
        
        // Handle errors that occurred during the request
    }
    
  };

  const handleInputChange = (field, value, e) => {
    setErrorMessages((prevErrors) => ({ ...prevErrors, [field]: null }));

    // Manually focus on the previous or next input field based on key press
    switch (field) {
      case 'otp1':
        if (value.length === 1 && e.key !== 'Backspace') {
          form.setFieldsValue({ otp2: '' }); // Clear the second input
          form.getFieldInstance('otp2').focus(); // Manually focus on the second input
        }
        break;
      case 'otp2':
        if (value.length === 1 && e.key !== 'Backspace') {
          form.setFieldsValue({ otp3: '' });
          form.getFieldInstance('otp3').focus();
        } else if (value.length === 0 && e.key === 'Backspace') {
          form.getFieldInstance('otp1').focus(); // Manually focus on the first input
        }
        break;
      case 'otp3':
        if (value.length === 1 && e.key !== 'Backspace') {
          form.setFieldsValue({ otp4: '' });
          form.getFieldInstance('otp4').focus();
        } else if (value.length === 0 && e.key === 'Backspace') {
          form.getFieldInstance('otp2').focus(); // Manually focus on the second input
        }
        break;
      case 'otp4':
        if (value.length === 0 && e.key === 'Backspace') {
          form.getFieldInstance('otp3').focus(); // Manually focus on the third input
        }
        break;
      default:
        break;
    }
  };

  return (
    <section className="main-wrapper">
            <div className="inner-div">
              <Logo />
              <Voice text={voicecontent}/>
              <Dynmictitle title="otp-verify" />
                <div className="outer-wrap">
                    <div className="bottomwrap">
                        <div className="hdngwrap">
                            <h6>Enter the code</h6>
                            <p>Enter the generated code display on the desktop screen</p>
                        </div>
                        <Form form={form} onFinish={onFinish} className="">
          <div className="otp-input-fields text-center">
            <div className="inputfields-wrap">
                    <Form.Item
                      name="otp1"
                      rules={[{ required: true, message: 'Please enter the first digit of OTP' }]}
                      noStyle
                    >
                      <Input
                        type="text"
                         inputMode="numeric"
                        maxLength={1}
                        onKeyDown={(e) => handleInputChange('otp1', e.target.value, e)}
                      />
                    </Form.Item>
                    <Form.Item
                      name="otp2"
                      rules={[{ required: true, message: 'Please enter the second digit of OTP' }]}
                      noStyle
                    >
                      <Input
                        type="text"
                         inputMode="numeric"
                        maxLength={1}
                        onKeyDown={(e) => handleInputChange('otp2', e.target.value, e)}
                      />
                    </Form.Item>
                    <Form.Item
                      name="otp3"
                      rules={[{ required: true, message: 'Please enter the third digit of OTP' }]}
                      noStyle
                    >
                      <Input
                        type="text"
                         inputMode="numeric"
                        maxLength={1}
                        onKeyDown={(e) => handleInputChange('otp3', e.target.value, e)}
                      />
                    </Form.Item>
                    <Form.Item
                      name="otp4"
                      rules={[{ required: true, message: 'Please enter the fourth digit of OTP' }]}
                      noStyle
                    >
                      <Input
                        type="text"
                         inputMode="numeric"
                        maxLength={1}
                        onKeyDown={(e) => handleInputChange('otp4', e.target.value, e)}
                      />
                    </Form.Item>
                  </div>
                  <div className="resend-wrap">
                    {/* <Button type="primary" className="otp-btn">
                      Resend OTP
                    </Button> */}
                  </div>
                </div>
                <div className="wrap-submit">
                <Button type="primary" htmlType="submit" className="submit-btn">
                  Submit
                </Button>
                </div>
              </Form>
                    </div>
                </div>
            </div>
        </section>
  );
};
export { getServerSideProps };
export default OtpVerify;
